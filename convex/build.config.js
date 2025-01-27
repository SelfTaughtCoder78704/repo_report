export default {
  platform: "node",
  customModules: [
    {
      name: "crypto",
      path: "node:crypto",
    },
    {
      name: "util",
      path: "node:util",
    },
    {
      name: "buffer",
      path: "node:buffer",
    },
  ],
}; 