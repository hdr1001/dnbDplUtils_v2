// *********************************************************************
//
// Get D&B Direct+ natural person principals for a list of DUNS
// JavaScript code file: getDnbDplNaturalPersonPrincipals.js
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

import * as path from 'path';
import { promises as fs } from 'fs';
import { 
   httpBlocks,
   ReqDnbDpl,
   readInpFile
} from './dnbDplLib.js';

//Application defaults
const tradeUp = null; //Set to {tradeUp: 'hq'} if trade-up is needed
const reasonCode = { orderReason: '6332' };

//Defaults for reading and writing files
const filePathIn = { root: '', dir: 'in', base: 'DUNS.txt' };
const filePathOut = { root: '', dir: 'out' };
const sDate = new Date().toISOString().split('T')[0];

const arrDBs = [
   {db: 'companyinfo',          dbShort: 'ci', level: 2, version: '1'},
   {db: 'principalscontacts',   dbShort: 'pc', level: 3, version: '2'},
   {db: 'hierarchyconnections', dbShort: 'hc', level: 1, version: '1'}
];

const arrBlockIDs = arrDBs.map(oDB => `${oDB.db}_L${oDB.level}_v${oDB.version}`);

//Read & parse the DUNS to retrieve from the file DUNS.txt
const arrDUNS = readInpFile(filePathIn);

//Process the principals objects in a stack of data blocks
function processPrincipals(org) {
   //mostSeniorPrincipals is a v1 array, mostSeniorPrincipal is a v2 object
   const { currentPrincipals, mostSeniorPrincipals, mostSeniorPrincipal } = org;

   let arrPrincipals = [];
   
   if(mostSeniorPrincipals && mostSeniorPrincipals.length > 0) { arrPrincipals = mostSeniorPrincipals }

   if(mostSeniorPrincipal && Object.keys(mostSeniorPrincipal).length > 0) { arrPrincipals.push(mostSeniorPrincipal) }

   arrPrincipals.forEach(principal => principal.isMostSenior = true);

   if(currentPrincipals && currentPrincipals.length > 0) {
      arrPrincipals = [].concat(arrPrincipals, currentPrincipals)
   }

   if(arrPrincipals.length === 0) { return [Promise.reject(new Error('No principals available'))] }

   return arrPrincipals.map(principal => {
      const arrIdNums = principal.idNumbers && principal.idNumbers.filter(id => id.idType.dnbCode === 3575);

      if(principal.subjectType === 'Businesses' &&
            Array.isArray(arrIdNums) && arrIdNums.length > 0) {

         principal.org = { duns: arrIdNums[0].idNumber };

         return Promise.resolve(principal);
      }
      else {
         return Promise.resolve(principal);
      }
   })
}

//Main application logic
if(arrDUNS.length === 0) { //Check if there are any valid DUNS available
   console.log('No valid DUNS available, exiting ...');
}
else { //Download and persist the data blocks for the requested DUNS
   console.log('Test file contains ' + arrDUNS.length + ' DUNS records');

   const arrReqs = arrDUNS.map(oDUNS => 
      new ReqDnbDpl(
         httpBlocks,
         [oDUNS.duns],
         { blockIDs: arrBlockIDs.join(','), ...reasonCode , ...tradeUp }
      )
         .execReq(`Request for DUNS ${oDUNS.duns}`, true)
   );

   Promise.all(arrReqs).then(arrDnbDplResp => {
      arrDnbDplResp.forEach(resp => {
         let org = null;

         if(resp && resp.oBody && resp.oBody.organization) {
            org = resp.oBody.organization
         }
         else { return }
   
         const fileBase = arrDBs.reduce((acc, oDB) => `${acc}_${oDB.dbShort}_l${oDB.level}`, 'dnb_dpl');
   
         const base = `${fileBase}_${org.duns}_${sDate}${resp.httpStatus === 200 ? '' : `_${resp.httpStatus}`}.json`;
   
         //fs.writeFile(path.format({ ...filePathOut, base }), resp.buffBody)
         //   .then( /* console.log(`Wrote file ${base} successfully`) */ )
         //   .catch(err => console.error(err.message));

         Promise.all(processPrincipals(org))
            .then(principals => {
               fs.writeFile(path.format({ ...filePathOut, base }), JSON.stringify(resp.oBody, null, 3))
                  .then( /* console.log(`Wrote file ${base} successfully`) */ )
                  .catch(err => console.error(err.message));
            })
            .catch(err => console.error(err.message));
      });
   });
}
