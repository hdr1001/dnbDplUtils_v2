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
   addToCharacterSeparatedRow,
   readInpFile
} from './dnbDplLib.js';
import { resolveSoa } from 'dns';

//Application defaults
const tradeUp = null; //Set to {tradeUp: 'hq'} if trade-up is needed
const reasonCode = { orderReason: '6332' };

//Defaults for reading and writing files
const filePathIn = { root: '', dir: 'in', base: 'DUNS.txt' };
const filePathOut = { root: '', dir: 'out' };
const sDate = new Date().toISOString().split('T')[0];

const arrDBs = [
   {db: 'companyinfo',              dbShort: 'ci', level: 2, version: '1'},
   {db: 'principalscontacts',       dbShort: 'pc', level: 3, version: '2'},
   {db: 'hierarchyconnections',     dbShort: 'hc', level: 1, version: '1'}
];

const arrBlockIDs = arrDBs.map(oDB => `${oDB.db}_L${oDB.level}_v${oDB.version}`);

//Read & parse the DUNS to retrieve from the file DUNS.txt
const arrDUNS = readInpFile(filePathIn);

function getDnbDplNatPersonPrincipals(org, compRet) {
   //mostSeniorPrincipals is a v1 array, mostSeniorPrincipal is a v2 object
   const { currentPrincipals, mostSeniorPrincipals, mostSeniorPrincipal } = org;

   let arrPrincipals = [];
   
   if(mostSeniorPrincipals && mostSeniorPrincipals.length > 0) { arrPrincipals = mostSeniorPrincipals }

   if(mostSeniorPrincipal && mostSeniorPrincipal.fullName) { arrPrincipals.push(mostSeniorPrincipal) }

   arrPrincipals.forEach(principal => principal.isMostSenior = true);

   if(currentPrincipals && currentPrincipals.length > 0) {
      arrPrincipals = [].concat(arrPrincipals, currentPrincipals)
   }

   if(arrPrincipals.length === 0) { return [''] }

   return Promise.all(arrPrincipals.map(principal => 
      new Promise((resolve, reject) => {
         resolve((compRet + addToCharacterSeparatedRow(principal.fullName)).slice(0, -1));
      })
   ));
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
            .then(resp => {
               const fileBase = arrDBs.reduce((acc, oDB) => `${acc}_${oDB.dbShort}_l${oDB.level}`, 'dnb_dpl');

               const base = `${fileBase}_${oDUNS.duns}_${sDate}${resp.httpStatus === 200 ? '' : `_${resp.httpStatus}`}.json`;

               fs.writeFile(path.format({ ...filePathOut, base }), resp.buffBody)
                  .then( /* console.log(`Wrote file ${base} successfully`) */ )
                  .catch(err => console.error(err.message));

               if(resp && resp.oBody && resp.oBody.organization) {
                  const org = resp.oBody.organization;

                  let ret = addToCharacterSeparatedRow(org.duns);
                  ret += addToCharacterSeparatedRow(org.primaryName);

                  getDnbDplNatPersonPrincipals(org, ret)
                     .then(values => {return values.join('\n')});
               }

               return '';
            })
            .catch(err => {console.error(err.message); return -1})
   );

   Promise.all(arrReqs).then(values => {
      const base = 'natPersonPrincipals.txt';

      fs.writeFile(path.format({ ...filePathOut, base }), values.join('\n'))
         .then( /* console.log(`Wrote file ${base} successfully`) */ )
         .catch(err => console.error(err.message));
   });
}
