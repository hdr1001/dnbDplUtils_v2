// *********************************************************************
//
// Get D&B Direct+ IDentity Resolution for a list of match criteria
// JavaScript code file: getDnbDplIDR.js
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
   httpIDR,
   ReqDnbDpl,
   readInpFile
} from './dnbDplLib.js';

//Defaults for reading and writing files
const filePathIn = { root: '', dir: 'in', base: 'IDR.txt' };
const filePathOut = { root: '', dir: 'out' };
const sDate = new Date().toISOString().split('T')[0];

//Read & parse the DUNS to retrieve from the file DUNS.txt
const arrCriteria = readInpFile(filePathIn, '|');

//Main application logic
if(arrCriteria.length === 0) { //Check if there are match criteria available
   console.log('No match criteria available, exiting ...');
}
else { //Download and persist the data blocks for the requested DUNS
   console.log('File contains ' + arrCriteria.length + ' records');

   arrCriteria.forEach((oCriteria, idx) => {
      new ReqDnbDpl(httpIDR, null, oCriteria)
         .execReq(`IDR request for criteria row ${idx + 1}`)
            .then(resp => {
               const base = `row${idx + 1}_${sDate}${resp.httpStatus === 200 ? '' : `_${resp.httpStatus}`}.json`;

               fs.writeFile(path.format({ ...filePathOut, base }), resp.buffBody)
                  .then( /* console.log(`Wrote file ${base} successfully`) */ )
                  .catch(err => console.error(err.message));
            })
            .catch(err => console.error(err.message))
   });
}
