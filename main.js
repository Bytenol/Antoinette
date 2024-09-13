import {BalanceMolecularEqn, uString} from "./src/balance.js";

const randomEqn = [
    "Na2SO4 + H2SO4 = NaHSO4",
    "H2O2 = H2O + O2",
    "CH4 + O2 = CO2 + H2O",
    "C3H8 + O2 = CO2 + H2O",
    "H3PO3 = H3PO4 + PH3",
    "Fe2(SO4)3 + NH3 + H2O = Fe(OH)3 + (NH4)2SO4",
    "Ca + H2O = Ca(OH)2 + H2",
    "Na + Cl2 = NaCl",
    "H2 + O2 = H2O",
    "NaNO3 = NaNO2 + O2",
    "Cu + HNO3 = Cu(NO3)2 + H2O + NO",
    "Fe2SiO4 + Mg2SiO4 + H2O + CO2 = Mg6(Si4O10)(OH)8 + Fe2O3 + CH4"
]

const $ = selector => document.querySelector(selector);


/**
 * Tranform the input text to a formatted version on the display much more understandable by the reader
 * @param txt is the input text
 * @param outputEl is the output element
 */
const renderFormatedEqn = (txt, outputEl, subNumber = true) => {
    outputEl.innerHTML = "";
    let str = ""
    for(let ch of txt) {
        if(subNumber && uString.digits.includes(ch))
            str += "<sub>" + ch + "</sub>";
        else str += ch;
    }
    outputEl.innerHTML = str;
    const snackbarEl = $("#snackbar");
    snackbarEl.classList.remove("active");
}


/**
 * This is the handler that perform the balacing procedures
 * @param inputEl is the input element
 */
const onBalanceHandler = (inputEl) => {
    const txt = inputEl.value;
    const res = BalanceMolecularEqn(txt);
    const snackbarEl = $("#snackbar");
    if(res.error) {
        snackbarEl.classList.add("active");
        snackbarEl.innerHTML = res.error;
        return;
    }
    let outputTxt = $("#output").innerHTML.replaceAll(" ", "").split("=").map(i => i.split("+")).flat();
    let strRes = "";
    for(let i = 0; i < outputTxt.length; i++) {
        const v = Math.abs(res.coeff[i]);
        const coeff = v !== 1 ? v : "";
        strRes += `<strong style="color: red">${coeff}</strong>${outputTxt[i]}`;
        if(i === res.reactants.length - 1) strRes += " = ";
        else {
            if(i < outputTxt.length - 1) strRes += " + ";
        }
    }
    $("#result").innerHTML = strRes;
}


const onRandomHandler = (inputEl, outputEl) => {
    const r = Math.floor(Math.random() * randomEqn.length);
    inputEl.value = randomEqn[r];
    renderFormatedEqn(inputEl.value, outputEl);
}


const main = () => {
    const inputEl = $("#input");
    const outputEl = $("#output");
    const balanceBtn = $("#balanceBtn");
    const randomBtn = $("#randomBtn");

    renderFormatedEqn(inputEl.value, outputEl);
    inputEl.addEventListener("input", () => renderFormatedEqn(inputEl.value, outputEl));
    balanceBtn.addEventListener("click", () => onBalanceHandler(inputEl));
    randomBtn.addEventListener("click", () => onRandomHandler(inputEl, outputEl));
}

addEventListener("load", main);