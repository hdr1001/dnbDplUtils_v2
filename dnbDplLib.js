// *********************************************************************
//
// D&B Direct+ Data Blocks shared library functions
// JavaScript code file: dnbDplLib.js
//
// Copyright 2022 Hans de Rooij
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
// either express or implied. See the License for the specific
// language governing permissions and limitations under the
// License.
//
// *********************************************************************

import * as https from 'https';
import * as path from 'path';
import { readFileSync } from 'fs';
import { RateLimiter } from 'limiter';

const dnbDplLimiter = new RateLimiter({ tokensPerInterval: 5, interval: 'second' });

//D&B Direct+ API defaults
const httpDnbDpl = {
   host: 'plus.dnb.com',
   method: 'GET',
   headers: {
      'Content-Type': 'application/json'
   }
};

//Index values into the HTTP attribute array
const httpToken = 0;
const httpBlocks = 1;
const httpBeneficialOwner = 2;
const httpFamilyTree = 3;

//D&B Direct+ defaults for individual endpoints
const arrHttpAttr = [
   {...httpDnbDpl, method: 'POST', path: '/v2/token'},
   {...httpDnbDpl, path: '/v1/data/duns'},
   {...httpDnbDpl, path: '/v1/beneficialowner'},
   {...httpDnbDpl, path: '/v1/familyTree'}
];

//Base64 encode the D&B Direct+ credentials
function getBase64EncCredentials() {
   if(!process.env.DNB_DPL_KEY || !process.env.DNB_DPL_SECRET) {
      let sErrMsg = 'Please set the Direct+ API credentials as environment variables\n';
      sErrMsg += 'When using a GitHub Codespace best paractice is to use Codespaces Secrets\n';
      sErrMsg += 'On your GitHub acct, go to Settings, Codespaces, Codespaces Secrets\n';
      sErrMsg += 'Otherwise just set the environment variables: DNB_DPL_TOKEN=abc1234...\n';
      
      console.log(sErrMsg);

      return '';
   }

   return Buffer.from(process.env.DNB_DPL_KEY + ':' + process.env.DNB_DPL_SECRET).toString('Base64');
}

//D&B Direct+ HTTP request class
class ReqDnbDpl {
   constructor(reqType, arrResource, oQryStr) {
      this.reqType = reqType;

      this.httpAttr = { ...arrHttpAttr[reqType] };

      if(arrResource && arrResource.length) {
         this.httpAttr.path += '/' + arrResource.join('/')
      };
   
      if(oQryStr) {this.httpAttr.path += '?' + new URLSearchParams(oQryStr).toString()}
   
      if(reqType === httpToken) {
         this.httpAttr.headers.Authorization = 'Basic ' + getBase64EncCredentials()
      }
      else {
         this.httpAttr.headers.Authorization = 'Bearer ' + process.env.DNB_DPL_TOKEN;
      }
   }

   //Execute the HTTP request on the D&B Direct+ request object
   execReq(reqMsgOnEnd, bRetObj) {
      //The actual HTTP request wrapped in a promise
      return new Promise((resolve, reject) => {
         dnbDplLimiter.removeTokens(1)
            .then(() => {
               const httpReq = https.request(this.httpAttr, resp => {
                  const body = [];
      
                  resp.on('error', err => reject(err));
      
                  resp.on('data', chunk => body.push(chunk));
      
                  resp.on('end', () => { //The data product is now available in full
                     if(reqMsgOnEnd) { 
                        console.log(`${reqMsgOnEnd} (HTTP status code ${resp.statusCode})`);
      
                        //if(resp.statusCode !== 200) { console.log(body.join('')) }
                     }
      
                     if(bRetObj) {
                        try {
                           resolve({ oBody: JSON.parse(body), httpStatus: resp.statusCode })
                        }
                        catch(err) { reject(err) }
                     }
                     else {
                         //Please note body is of type buffer!
                        resolve({ buffBody: body, httpStatus: resp.statusCode })
                     }
                  });
               });
      
               if(this.httpAttr.method === 'POST') {
                  if(this.reqType === httpToken) {
                     httpReq.write('{ "grant_type": "client_credentials" }')
                  }
               }
      
               httpReq.end();
            })
            .catch(err => reject(err))
      })
   }
}

function readDunsFile(oFilePath) {
   let arrDUNS = [];

   try {
      arrDUNS = readFileSync(path.format(oFilePath)).toString().split('\n');
   }
   catch(err) {
      console.log(err.message);
      return arrDUNS;
   }

   return arrDUNS
      .map(sDUNS => sDUNS.trim()) //Remove any unwanted whitespace
      .filter(sDUNS => !!sDUNS) //Remove empty values from the array
      .map(sDUNS => //Correct the old school XX-XXX-XXXX DUNS format
         sDUNS.length === 11 && sDUNS.slice(2, 3) === '-' && sDUNS.slice(6, 7) === '-'
            ? sDUNS.slice(0, 2) + sDUNS.slice(3, 6) + sDUNS.slice(7)
            : sDUNS
      )
      .filter(sDUNS => //Filter strings which are too long & non numeric values
         sDUNS.length <= 9 && /^\d*$/.test(sDUNS)
      )
      .map(sDUNS => '000000000'.slice(0, 9 - sDUNS.length) + sDUNS);
}

export {
   httpToken,
   httpBlocks,
   httpBeneficialOwner,
   httpFamilyTree,
   ReqDnbDpl,
   readDunsFile
};
