declare module "worker-loader?inline=no-fallback!*" {
  class WebpackWorker extends Worker {
      constructor();
  }
  export default WebpackWorker;
}
