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

import { 
   httpCriteriaSearch,
   ReqDnbDpl,
} from './dnbDplLib.js';

const oCriteria = {
   countryISOAlpha2Code: 'NL',
   addressLocality: 'Delft',
   usSicV4: ['5812'],
   isOutOfBusiness: false
}

new ReqDnbDpl(httpCriteriaSearch, null, oCriteria)
   .execReq('Executing a criteria search')
      .then(resp => {
         console.log(resp.buffBody.toString())
      })
      .catch(err => console.error(err.message))
