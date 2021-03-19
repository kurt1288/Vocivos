import React from 'react';
import ContentLoader from 'react-content-loader';

export const ModalPlaceholder = () => (
   <ContentLoader
      speed={2}
      width={400}
      height={60}
      viewBox="0 0 400 60"
      backgroundColor="#D1D5DB"
      foregroundColor="#ecebeb"
   >
      <rect x="0" y="0" rx="0" ry="0" width="400" height="44" />
   </ContentLoader>
);

export const CardLoader = () => (
   <ContentLoader
      speed={2}
      width={400}
      height={60}
      viewBox="0 0 400 60"
      backgroundColor="#374151"
      foregroundColor="#4B5563"
   >
      <rect x="0" y="0" rx="10" ry="10" width="200" height="20" />
      <rect x="0" y="45" rx="5" ry="5" width="100" height="10" />
   </ContentLoader>
);

export const HeaderLoader = () => (
   <ContentLoader
      speed={2}
      width={200}
      height={20}
      viewBox="0 0 200 20"
      backgroundColor="#374151"
      foregroundColor="#4B5563"
   >
      <rect x="0" y="0" rx="10" ry="10" width="200" height="20" />
   </ContentLoader>
);

export const ProfileLoader = () => (
   <ContentLoader
      speed={2}
      width={300}
      height={200}
      viewBox="0 0 300 200"
      backgroundColor="#374151"
      foregroundColor="#4B5563"
   >
      <rect x="0" y="0" rx="10" ry="10" width="100" height="20" />
      <rect x="0" y="30" rx="15" ry="15" width="250" height="30" />
   </ContentLoader>
);

export const AutoStepLoader = () => (
   <ContentLoader
      speed={2}
      width={398}
      height={100}
      viewBox="0 0 398 100"
      backgroundColor="#D1D5DB"
      foregroundColor="#E5E7EB"
   >
      <rect x="0" y="0" rx="5" ry="5" width="398" height="48" />
      <rect x="0" y="50" rx="5" ry="5" width="398" height="48" />
   </ContentLoader>
);

export const MarketCardLoader = () => (
   <div className="p-3 bg-gray-900 border border-gray-700 rounded">
      <div className="flex justify-between items-center pb-2 border-b border-gray-700">
         <ContentLoader
            speed={2}
            width={100}
            height={20}
            viewBox="0 0 100 20"
            backgroundColor="#9CA3AF"
            foregroundColor="#D1D5DB"
         >
            <rect x="0" y="0" rx="10" ry="10" width="100" height="20" />
         </ContentLoader>
      </div>
      <div className="text-sm my-3">
         <ContentLoader
            speed={2}
            width={175}
            height={70}
            viewBox="0 0 175 70"
            backgroundColor="#9CA3AF"
            foregroundColor="#D1D5DB"
         >
            <rect x="0" y="0" rx="7.5" ry="7.5" width="125" height="15" />
            <rect x="15" y="25" rx="7.5" ry="7.5" width="150" height="15" />
            <rect x="15" y="50" rx="7.5" ry="7.5" width="150" height="15" />
         </ContentLoader>
      </div>
   </div>
);
