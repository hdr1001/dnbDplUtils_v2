// *********************************************************************
//
// Get D&B Direct+ Criteria Search
// JavaScript code file: getDnbDplCriteriaSearch.js
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
   httpCriteriaSearch,
   ReqDnbDpl,
} from './dnbDplLib.js';

const filePathOut = { root: '', dir: 'out' };

const oCriteria = {
   numberOfEmployees: { informationScope: 9066, minimumValue: 5, maximumValue: 25},
   usSicV4: ['7538'],
   isOutOfBusiness: false
}

const countries = ['AU', 'AT', 'BE', 'BA', 'BG', 'CA', 'CN', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR',
                     'DE', 'GR', 'HU', 'IN', 'IE', 'IT', 'JP', 'XK', 'LV', 'LT', 'LU', 'MK', 'MT',
                     'ME', 'NL', 'NO', 'PL', 'PT', 'CY', 'RO', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH',
                     'GB', 'US'];

countries.forEach(ctry => 
   new ReqDnbDpl(httpCriteriaSearch, null, { ...oCriteria, countryISOAlpha2Code: ctry})
      .execReq('Executing a criteria search')
         .then(resp => {
            const base = `criteriaSearch_${ctry}${resp.httpStatus === 200 ? '' : `_${resp.httpStatus}`}.json`;

            fs.writeFile(path.format({ ...filePathOut, base }), resp.buffBody)
               .then( /* console.log(`Wrote file ${base} successfully`) */ )
               .catch(err => console.error(err.message))
         })
         .catch(err => console.error(err.message))
);
