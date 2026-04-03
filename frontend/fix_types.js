const fs = require('fs');
const file = '/Users/volt/Documents/PORTFOLIOS/personal/life-os/frontend/src/store/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/measurements\?: \{[\s\S]*?\}/, `measurements?: {
    chest?: number
    waist?: number
    hips?: number
    arms?: number
    leftArm?: number
    rightArm?: number
    thighs?: number
    leftThigh?: number
    rightThigh?: number
    neck?: number
    shoulders?: number
    forearms?: number
    leftForearm?: number
    rightForearm?: number
    calves?: number
    leftCalf?: number
    rightCalf?: number
  }`);

fs.writeFileSync(file, code);
