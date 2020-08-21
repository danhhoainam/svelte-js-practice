
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function get_binding_group_value(group, __value, checked) {
        const value = new Set();
        for (let i = 0; i < group.length; i += 1) {
            if (group[i].checked)
                value.add(group[i].__value);
        }
        if (!checked) {
            value.delete(__value);
        }
        return Array.from(value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/CustomInput.svelte generated by Svelte v3.24.1 */

    const file = "src/CustomInput.svelte";

    function create_fragment(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			add_location(input, file, 8, 0, 85);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*val*/ ctx[0]);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[2]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*val*/ 1 && input.value !== /*val*/ ctx[0]) {
    				set_input_value(input, /*val*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { val } = $$props;

    	function empty() {
    		$$invalidate(0, val = "");
    	}

    	const writable_props = ["val"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CustomInput> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("CustomInput", $$slots, []);

    	function input_input_handler() {
    		val = this.value;
    		$$invalidate(0, val);
    	}

    	$$self.$$set = $$props => {
    		if ("val" in $$props) $$invalidate(0, val = $$props.val);
    	};

    	$$self.$capture_state = () => ({ val, empty });

    	$$self.$inject_state = $$props => {
    		if ("val" in $$props) $$invalidate(0, val = $$props.val);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [val, empty, input_input_handler];
    }

    class CustomInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { val: 0, empty: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CustomInput",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*val*/ ctx[0] === undefined && !("val" in props)) {
    			console.warn("<CustomInput> was created without expected prop 'val'");
    		}
    	}

    	get val() {
    		throw new Error("<CustomInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set val(value) {
    		throw new Error("<CustomInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get empty() {
    		return this.$$.ctx[1];
    	}

    	set empty(value) {
    		throw new Error("<CustomInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Toggle.svelte generated by Svelte v3.24.1 */

    const file$1 = "src/Toggle.svelte";

    function create_fragment$1(ctx) {
    	let button0;
    	let t0;
    	let button0_disabled_value;
    	let t1;
    	let button1;
    	let t2;
    	let button1_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			t0 = text("Option 1");
    			t1 = space();
    			button1 = element("button");
    			t2 = text("Option 2");
    			button0.disabled = button0_disabled_value = /*chosenOption*/ ctx[0] === 1;
    			add_location(button0, file$1, 4, 0, 51);
    			button1.disabled = button1_disabled_value = /*chosenOption*/ ctx[0] === 2;
    			add_location(button1, file$1, 7, 0, 147);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			append_dev(button0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[1], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*chosenOption*/ 1 && button0_disabled_value !== (button0_disabled_value = /*chosenOption*/ ctx[0] === 1)) {
    				prop_dev(button0, "disabled", button0_disabled_value);
    			}

    			if (dirty & /*chosenOption*/ 1 && button1_disabled_value !== (button1_disabled_value = /*chosenOption*/ ctx[0] === 2)) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { chosenOption = 1 } = $$props;
    	const writable_props = ["chosenOption"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Toggle> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Toggle", $$slots, []);
    	const click_handler = () => $$invalidate(0, chosenOption = 1);
    	const click_handler_1 = () => $$invalidate(0, chosenOption = 2);

    	$$self.$$set = $$props => {
    		if ("chosenOption" in $$props) $$invalidate(0, chosenOption = $$props.chosenOption);
    	};

    	$$self.$capture_state = () => ({ chosenOption });

    	$$self.$inject_state = $$props => {
    		if ("chosenOption" in $$props) $$invalidate(0, chosenOption = $$props.chosenOption);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [chosenOption, click_handler, click_handler_1];
    }

    class Toggle extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { chosenOption: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toggle",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get chosenOption() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set chosenOption(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function isValidEmail(val) {
      return val.includes("@");
    }

    /* src/App.svelte generated by Svelte v3.24.1 */

    const { console: console_1 } = globals;
    const file$2 = "src/App.svelte";

    function create_fragment$2(ctx) {
    	let custominput;
    	let updating_val;
    	let t0;
    	let toggle;
    	let updating_chosenOption;
    	let t1;
    	let input0;
    	let t2;
    	let label0;
    	let input1;
    	let t3;
    	let t4;
    	let hr0;
    	let t5;
    	let label1;
    	let input2;
    	let t6;
    	let t7;
    	let label2;
    	let input3;
    	let t8;
    	let t9;
    	let label3;
    	let input4;
    	let t10;
    	let t11;
    	let hr1;
    	let t12;
    	let label4;
    	let input5;
    	let t13;
    	let t14;
    	let label5;
    	let input6;
    	let t15;
    	let t16;
    	let label6;
    	let input7;
    	let t17;
    	let t18;
    	let hr2;
    	let t19;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t23;
    	let hr3;
    	let t24;
    	let input8;
    	let t25;
    	let button0;
    	let t27;
    	let hr4;
    	let t28;
    	let form;
    	let input9;
    	let input9_class_value;
    	let t29;
    	let button1;
    	let t30;
    	let button1_disabled_value;
    	let current;
    	let mounted;
    	let dispose;

    	function custominput_val_binding(value) {
    		/*custominput_val_binding*/ ctx[13].call(null, value);
    	}

    	let custominput_props = {};

    	if (/*val*/ ctx[0] !== void 0) {
    		custominput_props.val = /*val*/ ctx[0];
    	}

    	custominput = new CustomInput({ props: custominput_props, $$inline: true });
    	binding_callbacks.push(() => bind(custominput, "val", custominput_val_binding));
    	/*custominput_binding*/ ctx[14](custominput);

    	function toggle_chosenOption_binding(value) {
    		/*toggle_chosenOption_binding*/ ctx[15].call(null, value);
    	}

    	let toggle_props = {};

    	if (/*selectedOption*/ ctx[1] !== void 0) {
    		toggle_props.chosenOption = /*selectedOption*/ ctx[1];
    	}

    	toggle = new Toggle({ props: toggle_props, $$inline: true });
    	binding_callbacks.push(() => bind(toggle, "chosenOption", toggle_chosenOption_binding));

    	const block = {
    		c: function create() {
    			create_component(custominput.$$.fragment);
    			t0 = space();
    			create_component(toggle.$$.fragment);
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label0 = element("label");
    			input1 = element("input");
    			t3 = text("\n  Agree?");
    			t4 = space();
    			hr0 = element("hr");
    			t5 = space();
    			label1 = element("label");
    			input2 = element("input");
    			t6 = text("\n  Red");
    			t7 = space();
    			label2 = element("label");
    			input3 = element("input");
    			t8 = text("\n  Green");
    			t9 = space();
    			label3 = element("label");
    			input4 = element("input");
    			t10 = text("\n  Blue");
    			t11 = space();
    			hr1 = element("hr");
    			t12 = space();
    			label4 = element("label");
    			input5 = element("input");
    			t13 = text("\n  Good");
    			t14 = space();
    			label5 = element("label");
    			input6 = element("input");
    			t15 = text("\n  Bad");
    			t16 = space();
    			label6 = element("label");
    			input7 = element("input");
    			t17 = text("\n  Average");
    			t18 = space();
    			hr2 = element("hr");
    			t19 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Green";
    			option1 = element("option");
    			option1.textContent = "Red";
    			option2 = element("option");
    			option2.textContent = "Blue";
    			t23 = space();
    			hr3 = element("hr");
    			t24 = space();
    			input8 = element("input");
    			t25 = space();
    			button0 = element("button");
    			button0.textContent = "Save";
    			t27 = space();
    			hr4 = element("hr");
    			t28 = space();
    			form = element("form");
    			input9 = element("input");
    			t29 = space();
    			button1 = element("button");
    			t30 = text("Save");
    			attr_dev(input0, "type", "number");
    			add_location(input0, file$2, 52, 0, 1161);
    			attr_dev(input1, "type", "checkbox");
    			add_location(input1, file$2, 55, 2, 1215);
    			add_location(label0, file$2, 54, 0, 1205);
    			add_location(hr0, file$2, 59, 0, 1282);
    			attr_dev(input2, "type", "radio");
    			attr_dev(input2, "name", "color");
    			input2.__value = "red";
    			input2.value = input2.__value;
    			/*$$binding_groups*/ ctx[19][1].push(input2);
    			add_location(input2, file$2, 62, 2, 1300);
    			add_location(label1, file$2, 61, 0, 1290);
    			attr_dev(input3, "type", "radio");
    			attr_dev(input3, "name", "color");
    			input3.__value = "green";
    			input3.value = input3.__value;
    			/*$$binding_groups*/ ctx[19][1].push(input3);
    			add_location(input3, file$2, 66, 2, 1395);
    			add_location(label2, file$2, 65, 0, 1385);
    			attr_dev(input4, "type", "radio");
    			attr_dev(input4, "name", "color");
    			input4.__value = "blue";
    			input4.value = input4.__value;
    			/*$$binding_groups*/ ctx[19][1].push(input4);
    			add_location(input4, file$2, 70, 2, 1494);
    			add_location(label3, file$2, 69, 0, 1484);
    			add_location(hr1, file$2, 74, 0, 1582);
    			attr_dev(input5, "type", "checkbox");
    			attr_dev(input5, "name", "grade");
    			input5.__value = "good";
    			input5.value = input5.__value;
    			/*$$binding_groups*/ ctx[19][0].push(input5);
    			add_location(input5, file$2, 77, 2, 1600);
    			add_location(label4, file$2, 76, 0, 1590);
    			attr_dev(input6, "type", "checkbox");
    			attr_dev(input6, "name", "grade");
    			input6.__value = "bad";
    			input6.value = input6.__value;
    			/*$$binding_groups*/ ctx[19][0].push(input6);
    			add_location(input6, file$2, 81, 2, 1701);
    			add_location(label5, file$2, 80, 0, 1691);
    			attr_dev(input7, "type", "checkbox");
    			attr_dev(input7, "name", "grade");
    			input7.__value = "average";
    			input7.value = input7.__value;
    			/*$$binding_groups*/ ctx[19][0].push(input7);
    			add_location(input7, file$2, 85, 2, 1800);
    			add_location(label6, file$2, 84, 0, 1790);
    			add_location(hr2, file$2, 89, 0, 1898);
    			option0.__value = "green";
    			option0.value = option0.__value;
    			add_location(option0, file$2, 92, 2, 1945);
    			option1.__value = "red";
    			option1.value = option1.__value;
    			add_location(option1, file$2, 93, 2, 1984);
    			option2.__value = "blue";
    			option2.value = option2.__value;
    			add_location(option2, file$2, 94, 2, 2019);
    			if (/*singleFavColor*/ ctx[6] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[25].call(select));
    			add_location(select, file$2, 91, 0, 1906);
    			add_location(hr3, file$2, 97, 0, 2065);
    			attr_dev(input8, "type", "text");
    			attr_dev(input8, "id", "username");
    			add_location(input8, file$2, 99, 0, 2073);
    			add_location(button0, file$2, 100, 0, 2130);
    			add_location(hr4, file$2, 102, 0, 2173);
    			attr_dev(input9, "type", "email");
    			attr_dev(input9, "class", input9_class_value = "" + (null_to_empty(isValidEmail(/*enteredEmail*/ ctx[9]) ? "" : "invalid") + " svelte-u5nd84"));
    			add_location(input9, file$2, 105, 2, 2215);
    			attr_dev(button1, "type", "submit");
    			button1.disabled = button1_disabled_value = !/*formIsValid*/ ctx[10];
    			add_location(button1, file$2, 109, 2, 2330);
    			add_location(form, file$2, 104, 0, 2181);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(custominput, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(toggle, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input0, anchor);
    			set_input_value(input0, /*price*/ ctx[2]);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, label0, anchor);
    			append_dev(label0, input1);
    			input1.checked = /*agreed*/ ctx[3];
    			append_dev(label0, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, hr0, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, input2);
    			input2.checked = input2.__value === /*favColor*/ ctx[4];
    			append_dev(label1, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, label2, anchor);
    			append_dev(label2, input3);
    			input3.checked = input3.__value === /*favColor*/ ctx[4];
    			append_dev(label2, t8);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, label3, anchor);
    			append_dev(label3, input4);
    			input4.checked = input4.__value === /*favColor*/ ctx[4];
    			append_dev(label3, t10);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, hr1, anchor);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, label4, anchor);
    			append_dev(label4, input5);
    			input5.checked = ~/*gradeType*/ ctx[5].indexOf(input5.__value);
    			append_dev(label4, t13);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, label5, anchor);
    			append_dev(label5, input6);
    			input6.checked = ~/*gradeType*/ ctx[5].indexOf(input6.__value);
    			append_dev(label5, t15);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, label6, anchor);
    			append_dev(label6, input7);
    			input7.checked = ~/*gradeType*/ ctx[5].indexOf(input7.__value);
    			append_dev(label6, t17);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, hr2, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, select, anchor);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*singleFavColor*/ ctx[6]);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, hr3, anchor);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, input8, anchor);
    			/*input8_binding*/ ctx[26](input8);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, hr4, anchor);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, input9);
    			set_input_value(input9, /*enteredEmail*/ ctx[9]);
    			append_dev(form, t29);
    			append_dev(form, button1);
    			append_dev(button1, t30);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[16]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[17]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[18]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[20]),
    					listen_dev(input4, "change", /*input4_change_handler*/ ctx[21]),
    					listen_dev(input5, "change", /*input5_change_handler*/ ctx[22]),
    					listen_dev(input6, "change", /*input6_change_handler*/ ctx[23]),
    					listen_dev(input7, "change", /*input7_change_handler*/ ctx[24]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[25]),
    					listen_dev(button0, "click", /*saveDate*/ ctx[11], false, false, false),
    					listen_dev(input9, "input", /*input9_input_handler*/ ctx[27]),
    					listen_dev(form, "submit", prevent_default(/*submit_handler*/ ctx[12]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const custominput_changes = {};

    			if (!updating_val && dirty & /*val*/ 1) {
    				updating_val = true;
    				custominput_changes.val = /*val*/ ctx[0];
    				add_flush_callback(() => updating_val = false);
    			}

    			custominput.$set(custominput_changes);
    			const toggle_changes = {};

    			if (!updating_chosenOption && dirty & /*selectedOption*/ 2) {
    				updating_chosenOption = true;
    				toggle_changes.chosenOption = /*selectedOption*/ ctx[1];
    				add_flush_callback(() => updating_chosenOption = false);
    			}

    			toggle.$set(toggle_changes);

    			if (dirty & /*price*/ 4 && to_number(input0.value) !== /*price*/ ctx[2]) {
    				set_input_value(input0, /*price*/ ctx[2]);
    			}

    			if (dirty & /*agreed*/ 8) {
    				input1.checked = /*agreed*/ ctx[3];
    			}

    			if (dirty & /*favColor*/ 16) {
    				input2.checked = input2.__value === /*favColor*/ ctx[4];
    			}

    			if (dirty & /*favColor*/ 16) {
    				input3.checked = input3.__value === /*favColor*/ ctx[4];
    			}

    			if (dirty & /*favColor*/ 16) {
    				input4.checked = input4.__value === /*favColor*/ ctx[4];
    			}

    			if (dirty & /*gradeType*/ 32) {
    				input5.checked = ~/*gradeType*/ ctx[5].indexOf(input5.__value);
    			}

    			if (dirty & /*gradeType*/ 32) {
    				input6.checked = ~/*gradeType*/ ctx[5].indexOf(input6.__value);
    			}

    			if (dirty & /*gradeType*/ 32) {
    				input7.checked = ~/*gradeType*/ ctx[5].indexOf(input7.__value);
    			}

    			if (dirty & /*singleFavColor*/ 64) {
    				select_option(select, /*singleFavColor*/ ctx[6]);
    			}

    			if (!current || dirty & /*enteredEmail*/ 512 && input9_class_value !== (input9_class_value = "" + (null_to_empty(isValidEmail(/*enteredEmail*/ ctx[9]) ? "" : "invalid") + " svelte-u5nd84"))) {
    				attr_dev(input9, "class", input9_class_value);
    			}

    			if (dirty & /*enteredEmail*/ 512 && input9.value !== /*enteredEmail*/ ctx[9]) {
    				set_input_value(input9, /*enteredEmail*/ ctx[9]);
    			}

    			if (!current || dirty & /*formIsValid*/ 1024 && button1_disabled_value !== (button1_disabled_value = !/*formIsValid*/ ctx[10])) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(custominput.$$.fragment, local);
    			transition_in(toggle.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(custominput.$$.fragment, local);
    			transition_out(toggle.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			/*custominput_binding*/ ctx[14](null);
    			destroy_component(custominput, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(toggle, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(hr0);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(label1);
    			/*$$binding_groups*/ ctx[19][1].splice(/*$$binding_groups*/ ctx[19][1].indexOf(input2), 1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(label2);
    			/*$$binding_groups*/ ctx[19][1].splice(/*$$binding_groups*/ ctx[19][1].indexOf(input3), 1);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(label3);
    			/*$$binding_groups*/ ctx[19][1].splice(/*$$binding_groups*/ ctx[19][1].indexOf(input4), 1);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(hr1);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(label4);
    			/*$$binding_groups*/ ctx[19][0].splice(/*$$binding_groups*/ ctx[19][0].indexOf(input5), 1);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(label5);
    			/*$$binding_groups*/ ctx[19][0].splice(/*$$binding_groups*/ ctx[19][0].indexOf(input6), 1);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(label6);
    			/*$$binding_groups*/ ctx[19][0].splice(/*$$binding_groups*/ ctx[19][0].indexOf(input7), 1);
    			if (detaching) detach_dev(t18);
    			if (detaching) detach_dev(hr2);
    			if (detaching) detach_dev(t19);
    			if (detaching) detach_dev(select);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(hr3);
    			if (detaching) detach_dev(t24);
    			if (detaching) detach_dev(input8);
    			/*input8_binding*/ ctx[26](null);
    			if (detaching) detach_dev(t25);
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t27);
    			if (detaching) detach_dev(hr4);
    			if (detaching) detach_dev(t28);
    			if (detaching) detach_dev(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let val = "";
    	let selectedOption;
    	let price = 0;
    	let agreed;
    	let favColor;
    	let gradeType = [];
    	let singleFavColor = "red";
    	let username = "";
    	let customInput;
    	let enteredEmail = "";
    	let formIsValid = false;

    	function setValue(event) {
    		$$invalidate(0, val = event.target.value);
    	}

    	function saveDate(event) {
    		// console.log(document.querySelector("#username").value);
    		console.log(username.value);

    		customInput.empty();
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const $$binding_groups = [[], []];

    	function submit_handler(event) {
    		bubble($$self, event);
    	}

    	function custominput_val_binding(value) {
    		val = value;
    		$$invalidate(0, val);
    	}

    	function custominput_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			customInput = $$value;
    			$$invalidate(8, customInput);
    		});
    	}

    	function toggle_chosenOption_binding(value) {
    		selectedOption = value;
    		$$invalidate(1, selectedOption);
    	}

    	function input0_input_handler() {
    		price = to_number(this.value);
    		$$invalidate(2, price);
    	}

    	function input1_change_handler() {
    		agreed = this.checked;
    		$$invalidate(3, agreed);
    	}

    	function input2_change_handler() {
    		favColor = this.__value;
    		$$invalidate(4, favColor);
    	}

    	function input3_change_handler() {
    		favColor = this.__value;
    		$$invalidate(4, favColor);
    	}

    	function input4_change_handler() {
    		favColor = this.__value;
    		$$invalidate(4, favColor);
    	}

    	function input5_change_handler() {
    		gradeType = get_binding_group_value($$binding_groups[0], this.__value, this.checked);
    		$$invalidate(5, gradeType);
    	}

    	function input6_change_handler() {
    		gradeType = get_binding_group_value($$binding_groups[0], this.__value, this.checked);
    		$$invalidate(5, gradeType);
    	}

    	function input7_change_handler() {
    		gradeType = get_binding_group_value($$binding_groups[0], this.__value, this.checked);
    		$$invalidate(5, gradeType);
    	}

    	function select_change_handler() {
    		singleFavColor = select_value(this);
    		$$invalidate(6, singleFavColor);
    	}

    	function input8_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			username = $$value;
    			$$invalidate(7, username);
    		});
    	}

    	function input9_input_handler() {
    		enteredEmail = this.value;
    		$$invalidate(9, enteredEmail);
    	}

    	$$self.$capture_state = () => ({
    		CustomInput,
    		Toggle,
    		isValidEmail,
    		val,
    		selectedOption,
    		price,
    		agreed,
    		favColor,
    		gradeType,
    		singleFavColor,
    		username,
    		customInput,
    		enteredEmail,
    		formIsValid,
    		setValue,
    		saveDate
    	});

    	$$self.$inject_state = $$props => {
    		if ("val" in $$props) $$invalidate(0, val = $$props.val);
    		if ("selectedOption" in $$props) $$invalidate(1, selectedOption = $$props.selectedOption);
    		if ("price" in $$props) $$invalidate(2, price = $$props.price);
    		if ("agreed" in $$props) $$invalidate(3, agreed = $$props.agreed);
    		if ("favColor" in $$props) $$invalidate(4, favColor = $$props.favColor);
    		if ("gradeType" in $$props) $$invalidate(5, gradeType = $$props.gradeType);
    		if ("singleFavColor" in $$props) $$invalidate(6, singleFavColor = $$props.singleFavColor);
    		if ("username" in $$props) $$invalidate(7, username = $$props.username);
    		if ("customInput" in $$props) $$invalidate(8, customInput = $$props.customInput);
    		if ("enteredEmail" in $$props) $$invalidate(9, enteredEmail = $$props.enteredEmail);
    		if ("formIsValid" in $$props) $$invalidate(10, formIsValid = $$props.formIsValid);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*enteredEmail*/ 512) {
    			 if (isValidEmail(enteredEmail)) {
    				$$invalidate(10, formIsValid = true);
    			} else {
    				$$invalidate(10, formIsValid = false);
    			}
    		}

    		if ($$self.$$.dirty & /*val*/ 1) {
    			 console.log(val);
    		}

    		if ($$self.$$.dirty & /*selectedOption*/ 2) {
    			 console.log(selectedOption);
    		}

    		if ($$self.$$.dirty & /*price*/ 4) {
    			 console.log(price);
    		}

    		if ($$self.$$.dirty & /*agreed*/ 8) {
    			 console.log(agreed);
    		}

    		if ($$self.$$.dirty & /*favColor*/ 16) {
    			 console.log(favColor);
    		}

    		if ($$self.$$.dirty & /*gradeType*/ 32) {
    			 console.log(gradeType);
    		}

    		if ($$self.$$.dirty & /*singleFavColor*/ 64) {
    			 console.log(singleFavColor);
    		}

    		if ($$self.$$.dirty & /*customInput*/ 256) {
    			 console.log(customInput);
    		}
    	};

    	return [
    		val,
    		selectedOption,
    		price,
    		agreed,
    		favColor,
    		gradeType,
    		singleFavColor,
    		username,
    		customInput,
    		enteredEmail,
    		formIsValid,
    		saveDate,
    		submit_handler,
    		custominput_val_binding,
    		custominput_binding,
    		toggle_chosenOption_binding,
    		input0_input_handler,
    		input1_change_handler,
    		input2_change_handler,
    		$$binding_groups,
    		input3_change_handler,
    		input4_change_handler,
    		input5_change_handler,
    		input6_change_handler,
    		input7_change_handler,
    		select_change_handler,
    		input8_binding,
    		input9_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
