import type { Config } from "tailwindcss";
// tw-animate-css provides the utility classes used by shadcn/ui (animate-in, fade-in, zoom-in, etc.)
// Use require here to avoid TypeScript complaining about missing type declarations for the package.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const animatePlugin = require('tw-animate-css');

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    plugins: [animatePlugin],
};

export default config;
