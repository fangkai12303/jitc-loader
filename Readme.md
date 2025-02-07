This is a webpack loader, it aims to add a fallback try-catch block to your code automatically during a webpack build process.

* JITC is an abbreviation ,it stands for Just Inject Try Catch.

This loader adds a fallback try-catch for asynchronous async await operations in React JSX files,
specifically targeting at await expressions. In other words, if you have an asynchronous function
but do not use an await expression when calling it in a React component, this loader will take effects, it will
add a try-catch block to your building assets around the target code block.

# Usage
## use as a npm package
1. install the package
```yarn add jitc-loader```
2. add the following code in your webpack config file.
```
{
  test: /\.(j|t)sx$/i,
  exclude: [
    /@babel(?:\/|\\{1,2})runtime/,
    /\.cy\.(js|mjs|jsx|ts|tsx)$/,
  ],
  use: [
    {
      loader: require.resolve('jitc-loader'),
      options: {
        babelOptions: {
          filename: 'index',
        },
        stats: false,  // optional, if true, will print the the performance stats to the console
        debug: false, // optional, if true, will print the the transformed code to the console
      },
    },
  ],
},
```

## use just source code

1. copy the source code of the loader to your project, and for example the path of the file is ```src/loaders/jitc-loader.js``` 
2. add the following code in your webpack config file.

```
{
  test: /\.(j|t)sx$/i,
  exclude: [
    /@babel(?:\/|\\{1,2})runtime/,
    /\.cy\.(js|mjs|jsx|ts|tsx)$/,
  ],
  use: [
    {
      loader: require.resolve(path.resolve(__dirname, "src/loaders/jitc-loader.js")),
      options: {
        babelOptions: {
          filename: 'index',
        },
        stats: false,  // optional, if true, will print the the performance stats to the console
        debug: false, // optional, if true, will print the the transformed code to the console
      },
    },
  ],
},
```
