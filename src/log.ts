const reset = "\x1b[0m";
const dim = "\x1b[2m";
const cyan = "\x1b[36m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const red = "\x1b[31m";

export const log = {
  info(message: string) {
    console.log(`${cyan}◆${reset} ${message}`);
  },
  step(message: string) {
    console.log(`${dim}…${reset} ${message}`);
  },
  success(message: string) {
    console.log(`${green}✔${reset} ${message}`);
  },
  warn(message: string) {
    console.warn(`${yellow}!${reset} ${message}`);
  },
  error(message: string) {
    console.error(`${red}✖${reset} ${message}`);
  },
};
