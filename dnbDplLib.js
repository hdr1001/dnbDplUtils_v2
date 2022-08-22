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
const httpIDR = 4;
const httpCriteriaSearch = 5;

//D&B Direct+ defaults for individual endpoints
const arrHttpAttr = [
   {...httpDnbDpl, method: 'POST', path: '/v2/token'},
   {...httpDnbDpl, path: '/v1/data/duns'},
   {...httpDnbDpl, path: '/v1/beneficialowner'},
   {...httpDnbDpl, path: '/v1/familyTree'},
   {...httpDnbDpl, path: '/v1/match/cleanseMatch'},
   {...httpDnbDpl, method: 'POST', path: '/v1/search/criteria'}
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
   
      if(oQryStr) {
         if(this.httpAttr.method === 'GET') {
            this.httpAttr.path += '?' + new URLSearchParams(oQryStr).toString()
         }

         if(this.httpAttr.method === 'POST') {
            this.oBody = oQryStr
         }
      }

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

                     const ret = { buffBody: body, httpStatus: resp.statusCode };
                     
                     if(bRetObj) {
                        try {
                           ret.oBody = JSON.parse(body);
                        }
                        catch(err) {
                           reject(err);
                           return;
                        }
                     }

                     resolve(ret);
                  });
               });
      
               if(this.httpAttr.method === 'POST') {
                  httpReq.write(JSON.stringify(this.oBody))
               }
      
               httpReq.end();
            })
            .catch(err => reject(err))
      })
   }
}

function addToCharacterSeparatedRow(value) {
   const separator = '|';

   switch(typeof value) {
       case 'string':  return value + separator;
       case 'boolean': return value.toString() + separator;
       case 'number':  return value.toString() + separator;
       case 'null':
       case 'undefined': console.log('Input value is null or undefined');
       default: return separator; 
   }
}

function readInpFile(oFilePath, splitOn) {
   let arrIn = [];

   //Read the input file (async)
   try {
      arrIn = readFileSync(path.format(oFilePath)).toString().split('\n')
   }
   catch(err) {
      console.log(err.message);
      return arrIn;
   }

   //Remove empty rows
   arrIn = arrIn.map(row => row.trim()).filter(row => !!row);

   //Split the row fields into columns
   if(splitOn) {
      arrIn = arrIn.map(row => row.split(splitOn))
   }

   //Split the rows into a header (arrIn) & input rows (arrRows)
   let arrRows = arrIn.splice(1);

   //Return an array of cleaned-up DUNS objects
   if(typeof arrIn[0] === 'string' && arrIn[0] === 'duns') {
      //DUNS file
      return arrRows
         .map(sDUNS => //Correct the old school XX-XXX-XXXX DUNS format
            sDUNS.length === 11 && sDUNS.slice(2, 3) === '-' && sDUNS.slice(6, 7) === '-'
               ? sDUNS.slice(0, 2) + sDUNS.slice(3, 6) + sDUNS.slice(7)
               : sDUNS
         )
         .filter(sDUNS => //Filter strings which are too long & non numeric values
            sDUNS.length <= 9 && /^\d*$/.test(sDUNS)
         )
         .map(sDUNS => ({ duns: '000000000'.slice(0, 9 - sDUNS.length) + sDUNS }));
   }

   //Return an array of request objects
   return arrRows.map(row => {
      let oRet = {};

      row.forEach((criterium, idx) => oRet[arrIn[0][idx]] = criterium);

      return oRet;
   });
}

export {
   httpToken,
   httpBlocks,
   httpBeneficialOwner,
   httpFamilyTree,
   httpIDR,
   httpCriteriaSearch,
   ReqDnbDpl,
   addToCharacterSeparatedRow,
   readInpFile
};
