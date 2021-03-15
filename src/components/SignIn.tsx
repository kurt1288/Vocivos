import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import Api from '../Api';
import { setToken, setUser } from '../store';

const GetApiKey = () => {
   const [userName, setUserName] = useState('');
   const [userToken, setUserToken] = useState('');
   const [formValid, setFormValid] = useState(false);
   const [signIn, setSignIn] = useState(false);
   const [error, setError] = useState('');
   const dispatch = useDispatch();

   const getApiKey = async (e: React.FormEvent) => {
      e.preventDefault();
      if (formValid) {
         try {
            const token = await Api.getToken(userName);
            localStorage.setItem('apiKey', JSON.stringify({ username: token.user.username, token: token.token }));
            dispatch(setToken({ username: token.user.username, token: token.token }));
            const user = await Api.getUser(token.user.username, token.token);
            dispatch(setUser(user));
         } catch (err:unknown) {
            setError((err as Error).message);
         }
      }
   };

   const Login = async (e: React.FormEvent) => {
      e.preventDefault();
      if (formValid) {
         try {
            // Validate the user/token
            const user = await Api.getUser(userName, userToken);

            localStorage.setItem('apiKey', JSON.stringify({ username: userName, token: userToken }));
            dispatch(setToken({ username: userName, token: userToken }));
            dispatch(setUser(user));
         } catch (err:unknown) {
            setError((err as Error).message);
         }
      }
   };

   const validate = () => {
      const valid = document.querySelector('form')?.checkValidity() as boolean;
      setFormValid(valid);
   };

   return (
      <div className="bg-gray-800 text-gray-200 w-full h-full flex flex-col items-center justify-center">
         <h1 className="text-4xl">Welcome to Vocivos!</h1>
         <h2 className="mb-6">A SpaceTraders API interface</h2>
         { error
            && <p className="bg-red-300 text-red-800 px-4 py-3 mb-4">{ error }</p>}
         <div className="flex items-left flex-col">
            { signIn
               ? (
                  <div className="border border-gray-700 rounded p-7 px-10 shadow-lg bg-gray-900">
                     <form className="mt-2">
                        <div>
                           <input type="text" placeholder="Username" className="text-gray-700 py-2 px-2 box-border border border-gray-400 rounded" onChange={(e) => { setUserName(e.target.value); validate(); }} required />
                        </div>
                        <div className="mt-3">
                           <input type="text" placeholder="Token" className="text-gray-700 py-2 px-2 box-border border border-gray-400 rounded" onChange={(e) => { setUserToken(e.target.value); validate(); }} />
                        </div>
                        <div className="mt-3">
                           <button type="submit" className="py-2 px-4 w-full text-white bg-green-600 rounded hover:bg-green-700" onClick={Login}>Login</button>
                        </div>
                     </form>
                     <p className="text-sm mt-4 text-center">Need an account? <button type="button" className="text-yellow-500 hover:text-yellow-400" onClick={() => setSignIn(false)}>Register</button></p>
                  </div>
               )
               : (
                  <div className="border border-gray-700 rounded p-7 px-10 shadow-lg bg-gray-900">
                     <form className="mt-2">
                        <input type="text" placeholder="Username" className="text-gray-700 py-2 px-2 box-border border border-gray-400 rounded" onChange={(e) => { setUserName(e.target.value); validate(); }} required />
                        <div className="mt-3">
                           <button type="submit" className="py-2 px-4 w-full text-white bg-green-600 rounded hover:bg-green-700" onClick={getApiKey}>Sign Up</button>
                        </div>
                     </form>
                     <p className="text-sm mt-4 text-center">Already have an account? <button type="button" className="text-yellow-500 hover:text-yellow-400" onClick={() => setSignIn(true)}>Sign in</button></p>
                  </div>
               )}
         </div>
      </div>
   );
};

export default GetApiKey;
