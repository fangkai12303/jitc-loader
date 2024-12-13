const {
  transformAsync,
  traverse,
  template,
  transformFromAstAsync,
  types,
} = require('@babel/core');

/** a common try-catch syntax template string, used with a function which has a body brace */
const tryCatchTemplate = `
try {
} catch (e) {
console.error(e);
}`;

/** a try-catch syntax template string, used with an arrow function which doesn't have a body brace,
 * like const a = () => bExpression.
 */
const directAwaitToCatchTemplate = `
{
let data;
try {
data=DIRECT_RETURNED_EXPRESSION;
} catch (e) {
console.error(e);
}
return data;
}`;

/**jitc abbreviates for jsx-inject-try-catch */
const reservedMap = new Map().set('ignoreRule', '@jitc-ignore-next-line');

const commonTryCatchBuilder = template(tryCatchTemplate);
const directAwaitTryCatchBuilder = template(directAwaitToCatchTemplate);

/**
 * This loader adds a fallback try-catch for asynchronous async await operations in React JSX files,
 * specifically targeting at await expressions. In other words, if you have an asynchronous function
 * but do not use an await expression when calling it in a React component, this loader will not take effect.
 * loader options = {
 *      // used with babel, this is required,babelOptions is compatible with babel
 *      babelOptions: { filename: string },
 *      // whether to display a verbose log when the loader works
 *      debug?: boolean,
 *      // whether to show the performance of this loader
 *      stats?: boolean
 *   }
 *
 * @param {*} source the original source code, usually it is a string.
 * @returns void
 */
module.exports = async function loader(source) {
  const { debug, stats, babelOptions } = this.getOptions();
  const debugLog = loaderDebug.bind(this, debug);
  let newSource = { code: source };
  const hookStats = generateStats(stats, this);
  hookStats.start();
  try {
    const { ast } = await transformAsync(source, {
      ast: true,
      ...babelOptions,
    });
    traverse(ast, {
      AwaitExpression(path) {
        // return if the ‘await expression’ is already in a try-catch context
        if (path.findParent((p) => p.isTryStatement())) {
          return;
        }

        // return if the ‘await expression’ has an explicit ignore comment
        const commentPath = path.findParent(
          (p) => p.node.leadingComments && p.node.leadingComments.length
        );
        if (commentPath) {
          const commentNodes = commentPath.node.leadingComments;
          const latestComment = commentNodes[commentNodes.length - 1];
          const expectedCommentLine = path.node.loc.start.line - 1;
          if (
            latestComment.value.indexOf(reservedMap.get('ignoreRule')) > -1 &&
            latestComment.loc.start.line === expectedCommentLine
          ) {
            return;
          }
        }

        // search the ast nodes from current node bottom up, find the latest async function path, and then inject our try-catch template.
        const asyncPath = path.findParent(
          (p) =>
            p.node.async &&
            (p.isFunctionDeclaration() ||
              p.isArrowFunctionExpression() ||
              p.isFunctionExpression() ||
              p.isObjectMethod())
        );
        if (asyncPath) {
          const info = asyncPath.node.body;
          // in a function which has a body brace, replace it with our common try-catch template
          if (info.body && Array.isArray(info.body)) {
            const tryCatchNode = commonTryCatchBuilder();
            tryCatchNode.block.body.push(...info.body);
            info.body = [tryCatchNode];
          }
          // in a function which does not has a body brace, replace it with our directReturned try-catch template
          if (info.body === undefined && types.isAwaitExpression(info)) {
            const directCatchNode = directAwaitTryCatchBuilder({
              DIRECT_RETURNED_EXPRESSION: info,
            });
            asyncPath.node.body = directCatchNode;
          }
        }
      },
    });
    newSource = await transformFromAstAsync(ast);
    debugLog('🚀 ~ loader ~ newSource:', newSource.code);
  } catch (error) {
    debugLog('jsx-inject-try-catch failed with exception:', error);
  }
  hookStats.end();
  return newSource.code;
};

function loaderDebug(debugEnabled, ...msg) {
  debugEnabled && console.debug(...msg);
}

/** a map to record the total time of this loader */
const statsMap = new Map().set('total', 0);
/**
 * generate a stats object, used to record the performance of this loader.
 * @param {boolean} statsEnabled whether to show the performance of this loader
 * @param {*} compilation the webpack compilation object
 * @returns {object} a stats object
 */
function generateStats(statsEnabled, compilation) {
  const file = compilation.resourcePath;
  return {
    total: 0,
    enabled: statsEnabled,
    startTime: 0,
    endTime: 0,
    file: file,
    start: function () {
      this.enabled && (this.startTime = performance.now());
    },
    end: function () {
      if (this.enabled) {
        this.endTime = performance.now();
        this.total = this.endTime - this.startTime;
        statsMap.set('total', statsMap.get('total') + this.total);
        this.statsOutput();
      }
    },
    statsOutput: function () {
      console.info(`transform ${this.file} spends ${this.total} ms`);
      console.info(
        `jitc loader works total time: ${statsMap.get('total').toFixed(2)} ms`
      );
    },
  };
}
