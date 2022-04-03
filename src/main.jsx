import React from 'react'
import ReactDOM from 'react-dom'
import './css/App.css'
import App from './js/App'
import { BrowserRouter } from "react-router-dom";
import store from "./js/store/store";
import { Provider } from "react-redux";
import './assets/icons/fontawesome';
import {setUpInterceptors} from './utils/axiosHelper.js'

setUpInterceptors(store);

ReactDOM.render(

  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
    <App />
    </BrowserRouter>
    </Provider>
  </React.StrictMode>,

  document.getElementById('root')
)
