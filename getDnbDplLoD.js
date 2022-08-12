// *********************************************************************
//
// Get D&B Direct+ Data for a list of DUNS
// JavaScript code file: getDnbDplLoD.js
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
   httpFamilyTree,
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

function getDnbDplDataBlockReqObj() {
   const arrDBs = [
      {db: 'companyinfo',              dbShort: 'ci', level: 2, version: '1'},
      {db: 'principalscontacts',       dbShort: 'pc', level: 3, version: '2'},
      {db: 'hierarchyconnections',     dbShort: 'hc', level: 1, version: '1'},
   //   {db: 'financialstrengthinsight', dbShort: 'fs', level: 2, version: '1'},
   //   {db: 'paymentinsight',           dbShort: 'pi', level: 1, version: '1'},
   //   {db: 'eventfilings',             dbShort: 'ef', level: 1, version: '1'},
   //   {db: 'companyfinancials',        dbShort: 'cf', level: 4, version: '2'},
   //   {db: 'globalfinancials',         dbShort: 'gf', level: 1, version: '1'},
   //   {db: 'esginsight',               dbShort: 'ei', level: 3, version: '1'},
   //   {db: 'ownershipinsight',         dbShort: 'oi', level: 1, version: '1'},
   //   {db: 'globalbusinessranking',    dbShort: 'br', level: 1, version: '1'}
   ];

   const arrBlockIDs = arrDBs.map(oDB => `${oDB.db}_L${oDB.level}_v${oDB.version}`);

   return {
      httpAttr: httpBlocks,
      arrBlockIDs,
      fileBase: arrDBs.reduce((acc, oDB) => `${acc}_${oDB.dbShort}_l${oDB.level}`, 'dnb_dpl'),
      qryStr: { blockIDs: arrBlockIDs.join(','), ...reasonCode , ...tradeUp }
   }
}

function getDnbDplBeneficialOwnerReqObj() {
   const cmpBeneficialOwner = 'cmpbol'; //Can be cmpbol or cmpbos

   return {
      httpAttr: httpBeneficialOwner,
      fileBase: `dnb_dpl_${cmpBeneficialOwner}`,
      qryStr: {
         productId: cmpBeneficialOwner,
         versionId: 'v1',
         ownershipPercentage: 2.5,
         tradeUp: 'hq'
      }
   }
}

function getDnbDplFullFamTreeReqObj() {
   return {
      httpAttr: httpFamilyTree,
      fileBase: `dnb_dpl_full_fam_tree`,
      qryStr: {} // { exclusionCriteria: 'Branches' }
   }
}

//Instantiate an array containing all relevant request objects
const arrReqObjs = [
   getDnbDplDataBlockReqObj(),
   getDnbDplBeneficialOwnerReqObj(),
   getDnbDplFullFamTreeReqObj(),
];

//Read & parse the DUNS to retrieve from the file DUNS.txt
const arrDUNS = readInpFile(filePathIn);

//Main application logic
if(arrDUNS.length === 0) { //Check if there are any valid DUNS available
   console.log('No valid DUNS available, exiting ...');
}
else { //Download and persist the data blocks for the requested DUNS
   console.log('Test file contains ' + arrDUNS.length + ' DUNS records');

   arrDUNS.forEach(oDUNS => {
      arrReqObjs.forEach(reqObj => {
         const req = { ...reqObj };

         if(req.httpAttr === httpBlocks || req.httpAttr === httpFamilyTree) {
            req.arrResource = [oDUNS.duns]
         }

         if(req.httpAttr === httpBeneficialOwner) {
            req.qryStr.duns = oDUNS.duns
         }

         new ReqDnbDpl(req.httpAttr, req.arrResource, req.qryStr)
            .execReq(`Request for DUNS ${oDUNS.duns}`)
               .then(resp => {
                  const base = `${req.fileBase}_${oDUNS.duns}_${sDate}${resp.httpStatus === 200 ? '' : `_${resp.httpStatus}`}.json`;

                  fs.writeFile(path.format({ ...filePathOut, base }), resp.buffBody)
                     .then( /* console.log(`Wrote file ${base} successfully`) */ )
                     .catch(err => console.error(err.message));
               })
               .catch(err => console.error(err.message));
      })
   });
}
