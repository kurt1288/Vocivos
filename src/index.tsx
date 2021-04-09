import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import store from './store';

ReactDOM.render(
   <React.StrictMode>
      <Provider store={store}>
         <BrowserRouter basename="/Vocivos">
            <App />
         </BrowserRouter>
      </Provider>
   </React.StrictMode>,
   document.getElementById('root'),
);
