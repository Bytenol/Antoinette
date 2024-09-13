import {matrix} from "./math.js";

let error = "";

const uString = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    digits: "0123456789",
    unprintable: "()"
};


/**
 * Retrieve as text the symb, count and charge of atoms in a text
 * @param txt is the text
 * @returns {*[]}
 */
const extractAtom = txt => {
    let atoms = [];
    for(let i = 0; i < txt.length; i++) {
        const ch = txt[i];
        if(uString.uppercase.includes(ch)) {
            atoms.push({ symb: "", count: "", charge: "" });
        }
        const curr = atoms[atoms.length - 1];
        if(curr) {
            if(!uString.digits.includes(ch)) curr.symb += ch;
            else curr.count += ch;
        }
    }
    return atoms;
}


class AtomNode {
    isStack;
    static openState = { WAITING: -1, CLOSED: 0, OPENED: 1 };
    openState = AtomNode.openState.OPENED;
    parent = null;
    text = "";
    subscript = "";
    constructor(isStack = false) {
        this.isStack = isStack;
    }
    /**
     * This method returns all atoms in the stack including their counts as an array of array
     */
    transverse() {
        let res = [];

        let curr = this;
        let subscript = parseInt(curr.subscript) || 1;
        while (curr.parent instanceof AtomNode) {
            curr = curr.parent;
            subscript *= parseInt(curr.subscript) || 1;
        }

        return extractAtom(this.text).map(i => {
            i.charge = parseInt(i.charge) || 0;
            i.count = (parseInt(i.count) || 1) * subscript;
            return i;
        });
    }

}

/***
 * This function group a chemical equation as a reactants and products
 * @param text is the chemical equation
 */
const groupReactantProduct = (text) => {
    error = "";
    text = text.replaceAll(" ", "");
    const [reactants, products] = text.split("=");
    if (!products) {
        error = "Equation does not have a product";
        return;
    }
    return [reactants.split("+"), products.split("+")];
};


/**
 * This function loop through a text and make a node list for all atoms present
 * @param formula is the text
 */
const makeAtomNodeLst = formula => {
    let lastNode = null;
    let currentNode = null;
    let stack = [];
    let res = [];
    for (let i = 0; i < formula.length; i++) {
        const lastCh = formula[i - 1] || "";
        const ch = formula[i];
        const nextCh = formula[i + 1] || "";
        if (ch === "(") {
            const node = new AtomNode(true);
            if (currentNode && currentNode.openState === AtomNode.openState.OPENED && currentNode.isStack) {
                node.parent = currentNode;
            }
            currentNode = node;
            stack.push(node);
        }
        if (uString.uppercase.includes(ch)) {
            if (!currentNode || !currentNode.isStack) {
                const node = new AtomNode(false);
                currentNode = node;
                res.push(node);
            }
        }
        if (currentNode && currentNode.openState === AtomNode.openState.OPENED) {
            if (!uString.unprintable.includes(ch))
                currentNode.text += ch;
        }
        // closing nodes
        if (ch === ")") {
            if (currentNode && currentNode.openState === AtomNode.openState.OPENED && currentNode.isStack) {
                // add subscript
                let iter = 1;
                let nextSub = nextCh;
                while (nextSub && uString.digits.includes(nextSub)) {
                    currentNode.subscript += nextSub;
                    iter++;
                    nextSub = formula[i + iter];
                }
                i += (iter - 1);
                currentNode.openState = AtomNode.openState.CLOSED;
                let node = stack.pop();
                res.push(node);
                currentNode = stack[stack.length - 1];
            }
            else {
                // to be better address later
                error = "Unmatching parenthesis";
                return;
            }
        }
    }
    return res;
};


const initEqnCoeff = paramLst => {
    let paramEqn = [];
    let paramDict = { };
    let paramSet = new Set();
    for(let i = 0; i < paramLst.length; i++) {
        const txt = paramLst[i];
        const nodeLst = makeAtomNodeLst(txt);
        paramEqn.push([]);

        // make equations
        nodeLst.forEach(node => {
            const transversed = node.transverse();
            transversed.forEach(atom => {
                paramSet.add(atom.symb);
                let shouldBreak = false;
                let prevAtomIndex = 0;
                for(let j = 0; j < paramEqn.length; j++) {
                    let eqn = paramEqn[i];
                    inner : {
                        for(let k = 0; k < eqn.length; k++) {
                            if(eqn[k].symb === atom.symb) {
                                prevAtomIndex = k;
                                shouldBreak = true;
                                break inner;
                            }
                        }
                        if(shouldBreak) break;
                    }
                }
                if(shouldBreak) {
                    paramEqn[i][prevAtomIndex].count += atom.count;
                } else
                paramEqn[i].push(atom);
            });
        });
    }

    return { eqn: paramEqn, set: paramSet };
};


const initEqnMatrix = (lhs, rhs) => {
    const allEqn = [...lhs.eqn, ...rhs.eqn];
    const atoms = [...lhs.set];
    const matrix = [];
    const coeff = [];
    for(let i = 0; i < atoms.length; i++) {
        const atom = atoms[i];
        matrix.push([]);
        for(let j = 0; j < allEqn.length; j++) {
            const eqn = allEqn[j];
            const atomFound = eqn.filter(i => i.symb === atom);
            let val = atomFound.length > 0 ? atomFound[0].count : 0;
            if(j < allEqn.length - 1) {
                if(j >= lhs.eqn.length) val *= -1;
                matrix[i].push(val);
            } else {
                coeff.push(val);
            }
        }
    }
    return [ matrix, coeff ];
}


const BalanceMolecularEqn = (text) => {

    const [reactants, products] = groupReactantProduct(text) || ["", ""];
    const res = { reactants, products };
    if(error) {
        res.error = error;
        return res;
    }

    const lhs = initEqnCoeff(reactants);
    const rhs = initEqnCoeff(products);

    // ensure the law of conservation of matter
    if(lhs.set.size !== rhs.set.size || ![...lhs.set].every(i => rhs.set.has(i))) {
        res.error = "Law of Conservation of Matter not implemented";
        return res;
    }

    // let d = [
    //     [2,0,0,0,0,-2],
    //     [1,1,0,0,-4,0],
    //     [4,4,1,2,-18,-3],
    //     [0,2,0,0,-6,0],
    //     [0,0,2,0,-8,0],
    //     [0,0,0,1,0,0]
    // ]
    //
    // let r = [0,0,0,0,4,1];

    const [ data, coeff ] = initEqnMatrix(lhs, rhs);
    const mat = matrix(data, coeff);
    const ech = mat.reduceEchelon();
    if(!ech) {
        res.error = "Multiple independent solution";
        return res;
    }
    res.coeff = !ech ? [] : ech.aug;
    return res;
};



export {
    uString,
    BalanceMolecularEqn
}