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

//Index values into the HTTP attribute array
const httpToken = 0;

//D&B Direct+ API defaults
const httpDnbDpl = {
   host: 'plus.dnb.com',
   method: 'GET',
   headers: {
      'Content-Type': 'application/json'
   }
};

//D&B Direct+ defaults for individual endpoints
const arrHttpAttr = [
   {...httpDnbDpl, method: 'POST', path: '/v2/token'}
];

//Base64 encode the D&B Direct+ credentials
function getBase64EncCredentials() {
   if(!process.env.DNB_DPL_KEY || !process.env.DNB_DPL_SECRET) {
      throw new Error('Please set API credentials as environment variables')
   }

   return Buffer.from(process.env.DNB_DPL_KEY + ':' + process.env.DNB_DPL_SECRET).toString('Base64');
}

//D&B Direct+ HTTP request class
class ReqDnbDpl {
   constructor(reqType, arrResource, oQryStr) {
      this.httpAttr = {...arrHttpAttr[reqType]};

      if(arrResource && arrResource.length) {
         this.httpAttr.path += '/' + arrResource.join('/')
      };
   
      if(oQryStr) {this.httpAttr.path += '?' + new URLSearchParams(oQryStr).stringify()}
   
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
         const httpReq = https.request(this.httpAttr, resp => {
            const body = [];

            resp.on('error', err => reject(err));

            resp.on('data', chunk => body.push(chunk));

            resp.on('end', () => { //The data product is now available in full
               if(reqMsgOnEnd) { 
                  console.log(reqMsgOnEnd + ' (HTTP status code ' + resp.statusCode + ')');

                  //if(resp.statusCode !== 200) { console.log(body.join('')) }
               }

               //if(bLogResp) { logResp(body, resp.statusCode) }

               if(bRetObj) {
                  try {
                     resolve(JSON.parse(body.join('')));
                  }
                  catch(err) { reject(err) }
               }
               else {
                  resolve(body);
               }
            });
         });

         if(this.httpAttr.method === 'POST') {
            httpReq.write('{ "grant_type": "client_credentials" }');
         }

         httpReq.end();
      });
   }
}

export { httpToken, ReqDnbDpl };
