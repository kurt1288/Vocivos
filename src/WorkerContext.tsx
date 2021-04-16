/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-webpack-loader-syntax */
/* eslint-disable react/prop-types */
import { Remote, wrap } from 'comlink';
import React, { createContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Api from 'worker-loader?filename=api.worker.js!./Api/api.worker';
import { Api as ApiClass, ApiType } from './Api/api.worker';
import { setToken } from './store';

interface Token {
   username: string,
   token: string
}

/** Big thanks to Redmega on Discord for coming up with 99% of this */

export const WorkerContext = createContext<[Remote<ApiClass>]>(undefined as unknown as [Remote<ApiClass>]);

export const WorkerProvider: React.FunctionComponent = function WorkerProvider({ children }) {
   const [worker, setWorker] = useState<[Remote<ApiClass>]>();
   const dispatch = useDispatch();
   const apiKey = localStorage.getItem('apiKey') ? JSON.parse(localStorage.getItem('apiKey') as string) as Token : null;

   // all your setup with async ref, etc.
   useEffect(() => {
      const ApiWorker = wrap<ApiType>(new Api());

      if (apiKey) {
         dispatch(setToken(apiKey));
         (new ApiWorker(apiKey.username, apiKey.token)).then((api) => {
            setWorker([api]);
         });
      } else {
         (new ApiWorker().then((api) => {
            setWorker([api]);
         }));
      }
   }, []);

   // We ensure worker is instantiated before rendering the rest of the dom tree
   return <WorkerContext.Provider value={worker as [Remote<ApiClass>]}>{!!worker && children}</WorkerContext.Provider>;
};
