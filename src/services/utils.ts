



/**
 * Returns true if at least one element matches the provided expression. If no expression is provided, the element's existence is used instead.
 * 
 * @export
 * @template T
 * @param {T[]} ctx
 * @param {(item: T) => boolean} [expr]
 * @returns {boolean}
 */
export function any<T>(ctx: T[], expr?: (item: T) => boolean): boolean {
  if (!ctx) return false;

  for (let i = 0; i < ctx.length; i++) {
    if (!expr || expr(ctx[i])) {
      return true;
    }
  }

  return false;
}