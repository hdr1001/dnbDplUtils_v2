// *********************************************************************
//
// Get a D&B Direct+ Authentication Token
// JavaScript code file: getDnbDplAuthToken.js
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

import { httpToken, ReqDnbDpl } from './dnbDplLib.js';

//Get a new authentication token
try {
   new ReqDnbDpl(httpToken).execReq('', true)
      .then(oResp => {
         if(oResp.access_token) {
            console.log(oResp.access_token)
         }
         else {
            console.log(JSON.stringify(oResp, null, 3))
         }
      })
      .catch(err => console.error(err.message));
}
catch(err) {
   console.error(err.message)
}
