// *********************************************************************
//
// Get D&B Direct+ Data Blocks for a list of DUNS
// JavaScript code file: getDBsForLoD.js
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
   httpBeneficialOwner,
   ReqDnbDpl,
   readDunsFile
} from './dnbDplLib.js';

//Default application settings
const arrDBs = [
   {db: 'companyinfo',              dbShort: 'ci', level: 2, version: '1'},
   {db: 'principalscontacts',       dbShort: 'pc', level: 3, version: '2'},
   {db: 'hierarchyconnections',     dbShort: 'hc', level: 1, version: '1'},
   {db: 'financialstrengthinsight', dbShort: 'fs', level: 2, version: '1'},
   {db: 'paymentinsight',           dbShort: 'pi', level: 1, version: '1'},
//   {db: 'eventfilings',             dbShort: 'ef', level: 1, version: '1'},
//   {db: 'companyfinancials',        dbShort: 'cf', level: 4, version: '2'},
   {db: 'globalfinancials',         dbShort: 'gf', level: 1, version: '1'},
//   {db: 'esginsight',               dbShort: 'ei', level: 3, version: '1'},
//   {db: 'ownershipinsight',         dbShort: 'oi', level: 1, version: '1'},
//   {db: 'globalbusinessranking',    dbShort: 'br', level: 1, version: '1'}
];
let httpEndpoint = httpBlocks;
const arrBlockIDs = arrDBs.map(oDB => `${oDB.db}_L${oDB.level}_v${oDB.version}`);
let fileBase = arrDBs.reduce((acc, oDB) => `${acc}_${oDB.dbShort}_l${oDB.level}`, 'dnb_dpl');
const tradeUp = null; //Set to {tradeUp: 'hq'} if trade-up is needed
const reasonCode = { orderReason: '6332' };
let qryStr = { blockIDs: arrBlockIDs.join(','), ...reasonCode , ...tradeUp };
const filePathIn = { root: '', dir: 'in', base: 'DUNS.txt' };
const filePathOut = { root: '', dir: 'out' };
const sDate = new Date().toISOString().split('T')[0];

//Beneficial ownership parameters
const cmpBeneficialOwner = ''; //Set to cmpbos or cmpbol for beneficial ownership data

//Read & parse the DUNS to retrieve from the file DUNS.txt
const arrDUNS = readDunsFile(filePathIn);

//Main application logic
if(arrDUNS.length === 0) { //Check if there are any valid DUNS available
   console.log('No valid DUNS available, exiting ...');
}
else { //Download and persist the data blocks for the requested DUNS
   console.log('Test file contains ' + arrDUNS.length + ' DUNS records');

   arrDUNS.forEach(DUNS => {
      if(cmpBeneficialOwner) {
         httpEndpoint = httpBeneficialOwner;

         qryStr = {
            duns: DUNS,
            productId: cmpBeneficialOwner,
            versionId: 'v1',
            ownershipPercentage: 2.5,
            tradeUp: 'hq'
         };

         fileBase = `dnb_dpl_${cmpBeneficialOwner}`;
      }

      new ReqDnbDpl(httpEndpoint, httpEndpoint === httpBlocks ? [DUNS] : '', qryStr)
         .execReq(`Request for DUNS ${DUNS}`)
            .then(resp => {
               const base = `${fileBase}_${DUNS}_${sDate}${resp.httpStatus === 200 ? '' : `_${resp.httpStatus}`}.json`;

               fs.writeFile(path.format({ ...filePathOut, base }), resp.buffBody)
                  .then( /* console.log(`Wrote file ${base} successfully`) */ )
                  .catch(err => console.error(err.message));
            })
            .catch(err => console.error(err.message));
   });
}
