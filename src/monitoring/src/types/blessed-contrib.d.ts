declare module 'blessed-contrib' {
  import blessed = require('blessed');

  namespace contrib {
    class grid {
      constructor(options: { rows: number; cols: number; screen: blessed.Widgets.Screen });
      set<T extends blessed.Widgets.BlessedElement>(
        row: number,
        col: number,
        rowSpan: number,
        colSpan: number,
        widget: ((opts?: Record<string, unknown>) => T) | string,
        options?: blessed.Widgets.ElementOptions,
      ): T;
    }
  }

  const contrib: {
    grid: typeof contrib.grid;
  };

  export = contrib;
}
