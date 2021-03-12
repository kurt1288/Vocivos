import React from 'react';
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { RootState } from '../store';
import { HeaderLoader } from './SkeletonLoaders';

const NavBar = () => {
   const user = useSelector((state:RootState) => state.user);

   return (
      <div className="px-8 text-gray-50 w-full min-h-16 bg-gray-900 flex justify-between items-center">
         <div className="flex items-center">
            {user.username === undefined
               ? <HeaderLoader />
               : (
                  <React.Fragment>
                     <h1><NavLink to="/" className="hover:text-yellow-600">{user.username}</NavLink></h1>
                     <span className="text-xs text-gray-400 ml-4">{ user.credits.toLocaleString() } credits</span>
                  </React.Fragment>
               )}
         </div>
         <div className="flex flex-row">
            <NavLink to="/ships" title="ships" className="w-7 h-7 mx-2 hover:text-yellow-600">
               <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" strokeWidth={1.3} viewBox="0 0 512.001 512.001">
                  <path d="m226 182.707h60v30h-60z" />
                  <path d="m482 340.339-95.167-73.476c-25.568-19.74-40.833-50.809-40.833-83.112v-46.044c0-28.454-8.007-56.148-23.156-80.091-14.729-23.279-35.535-42.055-60.168-54.298l-6.676-3.318-6.676 3.318c-24.632 12.243-45.438 31.019-60.168 54.298-15.148 23.943-23.156 51.637-23.156 80.091v46.044c0 32.303-15.265 63.372-40.833 83.112l-95.167 73.476v111.662h106v60h240v-60h106zm-226-306.578c32.849 18.929 54.461 51.693 59.067 88.946h-118.133c4.605-37.254 26.217-70.018 59.066-88.946zm-60 118.946h120v269.294h-120zm90 299.294v30h-60v-30zm-226-96.924 83.5-64.468c8.403-6.488 15.934-13.932 22.5-22.106v153.498h-106zm106 96.924h30v30h-30zm180 30h-30v-30h30zm106-60h-106v-153.498c6.565 8.174 14.096 15.618 22.499 22.106l83.501 64.468z" />
               </svg>
            </NavLink>
            <NavLink to="/loans" title="loans" className="w-7 h-7 mx-2 hover:text-yellow-600">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </NavLink>
            <NavLink to="/markets" title="Markets" className="w-7 h-7 mx-2 hover:text-yellow-600">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
               </svg>
            </NavLink>
            <NavLink to="/systems" title="locations" className="w-7 h-7 mx-2 hover:text-yellow-600">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
               </svg>
            </NavLink>
         </div>
      </div>
   );
};

export default NavBar;
