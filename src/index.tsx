/* eslint-disable import/no-webpack-loader-syntax */
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import * as Comlink from 'comlink';
/* eslint-disable-next-line import/no-unresolved */
import Worker from 'worker-loader!./webworker';
import { WorkerType } from './webworker';
import App from './App';
import store from './store';

const worker = Comlink.wrap<WorkerType>(new Worker());

ReactDOM.render(
   <React.StrictMode>
      <Provider store={store}>
         <BrowserRouter basename="/Vocivos">
            <App Worker={worker} />
         </BrowserRouter>
      </Provider>
   </React.StrictMode>,
   document.getElementById('root'),
);
