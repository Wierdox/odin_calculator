const history = document.getElementById("history");
const output  = document.getElementById("output");
const toggle  = document.getElementById("toggle");
let undo; // Defined in button creation loop.
let back; // Defined in button creation loop.

const ui = document.getElementById("ui");
const r0 = document.getElementById("r0"); // Button rows, top to bottom.
const r1 = document.getElementById("r1");
const r2 = document.getElementById("r2");
const r3 = document.getElementById("r3");



function get_pretty_op(op = "") {
    switch (op) {
        case "":  return op;
        case "+": return op;
        case "-": return op;
        case "*": return "×";
        case "/": return "÷";
    }
    return "Uh oh spa yeti ohs.";
}

function add(act) { return +act.a + +act.b; } // Prepened '+' to cast to Number.
function sub(act) { return +act.a - +act.b; }
function mul(act) { return +act.a * +act.b; }
function div(act) { return +act.a / +act.b; }

function do_action(action) {
    switch (action.op) {
        case "+": return add(action);
        case "-": return sub(action);
        case "*": return mul(action);
        case "/": return div(action);
        default:
            print(`Disaster, we can't do this operation: '${action}'.`);
            return 0;
    }
}

class Action {
    constructor (_a=0, _op="", _b=null) {
        this.a  = _a,
        this.op = _op,
        this.b  = _b
    }
}

let history_array = []; // Of Actions.
let current_action = new Action();

function current_action_has_op() {
    return (current_action.op != "");
}


// Random notes.
// * Action.b is can be null, for when it shouldn't be displayed. This is pretty gross,
//   it should have been another value to keep track.
// * Further, Action.a/b is sometimes Number, sometimes String. This was for ease of 
//   storing and displaying the input, but caused quite a few problems. Probably better
//   to store something like a_dispaly to keep the types consistent.

let font_size = "2.4vh";
{ // Setup buttons.
    let large_font_size = "2.8vh";
    let total = 20;
    for (let i = 0; i < total; i++) {
        let row = r0;

        let button = document.createElement("button");
        if (i < 10) { // Numpad.
            button.id        = i;
            button.innerText = i;
            button.style.fontSize = large_font_size;
            button.style.padding = "0";
            if (i == 0)     row = r4;
            else if (i < 4) row = r3;
            else if (i < 7) row = r2;
            else            row = r1;
            row.appendChild(button);
            continue;
        }

        let id = "";
        switch (i) {
            case 10:
                id = "+"; row = r3;
                break;
            case 11:
                id = "-"; row = r2;
                break;
            case 12:
                id = "*"; row = r1;
                break;
            case 13:
                id = "Delete"; row = r0;
                break;
            case 14:
                id = "z"; row = r0; button.disabled = true; undo = button;
                break;
            case 15:
                id = "Backspace"; row = r0; button.disabled = true; back = button;
                break;
            case 16:
                id = "/"; row = r0;
                break;
            case 17:
                id = "±"; row = r4;
                break;
            case 18:
                id = "."; row = r4;
                break;
            case 19:
                id = "="; row = r4;
                break;
            default:
                break;
        }
        button.id = id;

        // Change id to display glyph.
        switch (id) {
            case "*":
                id = "×";
                break
            case "/":
                id = "÷";
                break;
            case "Backspace":
                id = "Back";
                break;
            case "z":
                id = "Undo";
                break;
            case "Delete":
                id = "Clear";
                break;
        }
        button.innerText = id;
        if (id.length == 1) button.style.fontSize = large_font_size;
        else                button.style.fontSize = font_size;

        row.appendChild(button);
    }
}
const history_lines = 11; // Last one for 'there are _ more' blurb.
{ // Setup history text.
    for (let i = 0; i < history_lines; i++) {
        let line = document.createElement("div");
        line.style.fontSize = font_size;
        history.appendChild(line);
    }
}
const array_of_lines = Array.from(history.children).reverse();

reset(); // First frame setup.



ui.addEventListener("click", (event) => {
    let target = event.target;

    let id = target.id;
    if (id.startsWith("r")) return; // Hit an ui row container.
    if (id == "ui")         return;

    main(id); // The button IDs already match the keyboard key codes.
});

document.addEventListener("keydown", (event) => {
    event.preventDefault();

    let key = event.key;
    if (key == "Shift") key = "±"; // Small hack for last minute control.

    main(key, event.ctrlKey);
});

let use_short_floats = true;
toggle.addEventListener("click", (event) => {
    use_short_floats = !use_short_floats;
    draw();
    draw_history()
});



// Based on keyboard input.
function main(key = "", is_ctrl = true) {
    let changed_history = false;
    let changed_a = false; // Specifically for backspacing or apending, so it
    let changed_b = false; // doesn't look like nothing happens(on short floats).

    if (key.match("^[0-9\.±]") != null) {
        let negate = (key == "±");
        let is_dot = (key == ".");
        let has_dot = false;
        let super_return = false;

        function num_input(ident="") { // Called right after this, like a lambda.
            let variable = current_action[ident];
            if (variable != null) has_dot = dot_or_scientific(variable.toString())

            if (ident == "b" && variable == null
            ||  ident == "a" && variable == 0 && !has_dot) {
                if (negate) {super_return = true; return;}
                if (ident == "a") changed_a = true;
                else              changed_b = true;

                if (is_dot) current_action[ident] = "0."; // Bad form, but using + will trim the '.'
                else        current_action[ident] = +key;

                return;
            }
            if (is_dot && has_dot) {super_return = true; return;}
            let is_zero = (key == "0");

            let new_str = "";
            if (negate) {
                new_str = negate_str(variable.toString());
                current_action[ident] = new_str;
                return;
            } else {
                new_str = variable.toString() + key;
            }
            if (bad_value(+new_str)) {super_return = true; return;}

            if (ident == "a") changed_a = true;
            else              changed_b = true;

            if (is_dot || (has_dot && is_zero)) current_action[ident] = new_str; // Bad form, but using + will trim the '.'
            else                                current_action[ident] = +new_str;

            return;
        }

        if (current_action_has_op()) num_input("b");
        else                         num_input("a");
        
        if (super_return) return;

    } else if (key == "+" || key == "-" || key == "*" || key == "/") {
        current_action.op = key;
    } else if (key == "Enter" || key == "=") {
        if (current_action_has_op()) {
            if (current_action.b == null) return;
            
            let new_val = do_action(current_action);
            if (bad_value(new_val)) return;

            history_array.push(current_action);
            changed_history = true;
            current_action = new Action(new_val);
        } else { // Repeat previous action.
            if (history_array.at(-1)) {
                let last = history_array.at(-1);
                current_action.op = last.op;
                current_action.b  = last.b;
                let new_val = do_action(current_action);
                if (bad_value(new_val)) return;

                history_array.push(current_action);
                changed_history = true;
                current_action = new Action(new_val);
            }
        }
    } else if (key == "Backspace") {
        let has_dot = false;

        if (current_action_has_op()) {
            if (current_action.b == null) { // Delete operator.
                current_action.op = "";
                draw();
                return;
            }

            changed_b = true;
            let str = current_action.b.toString();
            has_dot = dot_or_scientific(str);
            
            if (has_dot) current_action.b = str.slice(0, str.length - 1);
            else         current_action.b = +str.slice(0, str.length - 1);

            // Delete last literal, including leading '-'.
            if (str.length == 1 || (str.length == 2 && str.at(0) == "-")) {
                current_action.b = null;
                draw()
                return;
            }

            sanitize_input_when_backspacing("b");
        } else {
            changed_a = true;
            let str = current_action.a.toString();
            has_dot = dot_or_scientific(str);

            if (!str.length) return;
            if (has_dot) current_action.a = str.slice(0, str.length - 1);
            else         current_action.a = +str.slice(0, str.length - 1);

            sanitize_input_when_backspacing("a");
        }
    } else if (key == "Delete") {
        reset();
    } else if (is_ctrl && key == "z") {
        undo_action();
        changed_history = true;
    }

    {
        draw(changed_a, changed_b);
        if (changed_history) draw_history();
    }
}

function sanitize_input_when_backspacing(ident="") {
    let variable = current_action[ident];

    // When backspacing over scientific notation, preventing NaN.
    let str = variable.toString();
    if (str.at(-1) == "-" || str.at(-1) == "+") {
        let e_index = str.indexOf("e");
        if (e_index == -1) print("Error: 69,105");
        current_action[ident] = str.slice(0, e_index);
        return;
    }

    // When backspacing on negative for 'current_action.a'. B is handled inline.
    if (variable == "-" || isNaN(variable)) { 
        let override = 0;
        if (ident == "b") override = null;
        current_action[ident] = override;
        return;
    }
}

function negate_str(str) {
    let dot_index = str.indexOf(".");
    let num = parseFloat(str);
    if (num == 0) return str;

    // Special case for negating a float, otherwise if it
    // has a trailing '.', or all zeros, it will truncate.
    let extra = "";
    if (dot_index != -1) {
        let all_zero = true;
        for (let i = dot_index+1; i < str.length; i++) {
            if (str.at(i) != "0") {
                all_zero = false;
                break;
            }
        }
        if (all_zero) extra = str.slice(dot_index);
    }

    num *= -1;
    let new_str = num.toString();
    if (!new_str.includes(".")) new_str += extra; // To be safe we double check.

    return new_str;
}

function draw(changed_a=false, changed_b=false) {
    let a  = get_num_display_string(current_action.a, changed_a);
    let op = get_pretty_op(current_action.op)
    let b  = get_num_display_string(current_action.b, changed_b);
    output.innerText = `${a} ${op} ${b}`;

    if ((a === 0 || a === "0") && op == "") back.disabled = true;
    else                                    back.disabled = false;
    
    if (history_array.length) undo.disabled = false;
    else                      undo.disabled = true;
}
function draw_history() {
    let opacity_rate = .65 / history_lines; // Min of .35 opcaity.
    for (let i = 0; i < history_lines; i++) {
        let line = array_of_lines[i];

        let is_sum_line = (i == history_lines - 1);
        let no_line = (i > history_array.length -1 );

        if (no_line) { // Invisible, to pad the space.
            line.innerText = "filler"
            line.style.opacity = 0;
            continue;
        } else if (is_sum_line && history_array.length >= history_lines) {
            let line_diff = history_array.length - history_lines;
            let plural = "s";
            if (line_diff == 0) plural = "";

            line.innerText = `And ${line_diff + 1} more action${plural}.`;
            line.style.opacity = 1.0;
            line.style.textDecoration = "underline";
            continue;
        }

        let index  = history_array.length-1 - i;
        let action = history_array[index];

        let a  = get_num_display_string(action.a);
        let op = get_pretty_op(action.op)
        let b  = get_num_display_string(action.b);
        let extra = "";
        if (i == 0) extra = "="; // Previous action always ends in =.

        line.innerText = `${a} ${op} ${b} ${extra}`;
        line.style.opacity = 1 - (opacity_rate * i);
        line.style.textDecoration = "none";
    }
}

const float_max_digits = 6;
function get_num_display_string(num, backspaced=false) {
    if (backspaced)  return num;
    if (num == null) return ""; // For b, which is null when not in use.

    let str = num.toString();
    let dot_index = str.indexOf(".");
    // Ignore when we add a float ourselves, and when not found.
    if (dot_index == str.length - 1 || dot_index == -1 || !use_short_floats) return str;

    // Not padding 0s, but trimed if going over float_max_digits.
    // + 1 needed to match the float_max_digits.
    let cut = Math.min(str.length - dot_index, float_max_digits) + 1;

    let extra = ""; // Add e notation for small floats.
    let e_index = str.indexOf("e");
    if (e_index != -1) {
        extra = str.slice(e_index);
        str   = str.slice(0, e_index);
    }

    str = str.slice(0, dot_index + cut) + extra;
    return str;
}

function reset() {
    history_array = [];
    current_action = new Action();
    output.innerText = current_action.a;
    draw_history();
}

function undo_action() {
    if (!history_array.length) return;

    current_action = history_array.pop();
}

function dot_or_scientific(str) {
    return (str.includes(".") || str.includes("e"));
}

function bad_value(val) { // Overrides output display, for normal fails like / 0.
    if (isNaN(val) || !isFinite(val)) {
        output.innerText = "I can't let you do that, Dave.";
        return true;
    }
    return false;
}
function print(message = "") { // Debug, should never run normally.
    console.log(message);

    let new_text = document.createElement("div");
    new_text.innerText = message;
    history.appendChild(new_text);
}