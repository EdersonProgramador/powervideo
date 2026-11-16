const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const apiDir = path.join(root, "apps", "api");
const isWin = process.platform === "win32";
const venvPython = path.join(
  apiDir,
  ".venv",
  isWin ? "Scripts" : "bin",
  isWin ? "python.exe" : "python"
);

const python = fs.existsSync(venvPython) ? venvPython : "python";
const args = process.argv.slice(2);

if (args.includes("--install")) {
  const pip = spawn(python, ["-m", "pip", "install", "-r", "requirements.txt"], {
    cwd: apiDir,
    stdio: "inherit",
    shell: false,
  });
  pip.on("exit", (code) => process.exit(code ?? 1));
} else {
  const uvicornArgs = ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"];
  if (args.includes("--reload")) uvicornArgs.push("--reload");
  const child = spawn(python, uvicornArgs, {
    cwd: apiDir,
    stdio: "inherit",
    shell: false,
  });
  child.on("exit", (code) => process.exit(code ?? 1));
}
