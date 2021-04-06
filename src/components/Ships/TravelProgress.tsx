import React from 'react';

interface Props {
   completed: number,
}

const TravelProgressBar = (props: Props) => {
   const { completed } = props;

   return (
      <div className="h-0.5 w-full text-right bg-gray-600">
         <div className="h-full text-right bg-green-500 max-w-full" style={{ width: `${completed}%`, transition: 'width 0.5s ease' }}>
            <span />
         </div>
      </div>
   );
};

export default TravelProgressBar;
