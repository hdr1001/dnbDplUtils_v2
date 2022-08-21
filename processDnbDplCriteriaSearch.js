// *********************************************************************
//
// Process D&B Direct+ criteria search results
// JavaScript code file: processDnbDplCriteriaSearch.js
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
import { RateLimiter } from 'limiter';

import { addToCharacterSeparatedRow } from './dnbDplLib.js'

const readFileLimiter = new RateLimiter({ tokensPerInterval: 50, interval: 'second' });

const filePath = { root: '', dir: 'out' };

fs.readdir(path.format(filePath))
    .then(arrFiles => {
        arrFiles = arrFiles.filter(fn => fn.endsWith('.json'))
                        .filter(fn => fn.indexOf('dnb_dpl') === -1)

        arrFiles.forEach(fn => {
            readFileLimiter.removeTokens(1)
                .then(() => {
                    fs.readFile(path.format({ ...filePath, base: fn }))
                        .then(file => {
                            let cs;

                            try {
                                cs = JSON.parse(file)
                            }
                            catch(err) {
                                console.error(err.message);
                                return;
                            }

                            const numCandRet = cs.candidatesReturnedQuantity;

                            if(numCandRet) {
                              const arrCand = cs.searchCandidates;

                              arrCand.forEach(candidate => {
                                 let retStr = '';

                                 const org = candidate.organization;

                                 retStr += addToCharacterSeparatedRow(org.primaryName);
                                 retStr += addToCharacterSeparatedRow(org?.primaryAddress?.addressCountry?.isoAlpha2Code);
                                 retStr += addToCharacterSeparatedRow(org.duns);

                                 console.log(retStr.slice(0, -1));
                              });
                            }
                        })
                        .catch(err => console.error(err.message))
                })
                .catch(err => console.error(err.message))
        });
    })
    .catch(err => console.error(err.message));
