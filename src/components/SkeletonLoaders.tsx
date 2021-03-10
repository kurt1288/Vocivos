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
