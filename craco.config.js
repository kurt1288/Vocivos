/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable global-require */
module.exports = {
   eslint: { enable: false },
   style: {
      postcss: {
         plugins: [
            require('tailwindcss'),
            require('autoprefixer'),
         ],
      },
   },
};
