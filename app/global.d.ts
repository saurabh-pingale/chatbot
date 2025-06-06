interface Window {
    Shopify?: {
      shop: string;
    };
  }

  declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}