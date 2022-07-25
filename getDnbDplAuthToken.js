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
new ReqDnbDpl(httpToken).execReq('', true)
   .then(oResp => {
      if(oResp.httpStatus === 200) {
         console.log(oResp.oBody.access_token)
      }
      else {
         console.log(JSON.stringify(oResp, null, 3))
      }
   })
   .catch(err => console.error(err.message));

/*
//List the token request response body
new ReqDnbDpl(httpToken).execReq('Authorization token request')
   .then(resp => console.log(resp.buffBody.toString()))
   .catch(err => console.error(err.message));
*/
