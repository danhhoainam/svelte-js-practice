
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
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
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
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
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    /* src/Product.svelte generated by Svelte v3.24.1 */
    const file = "src/Product.svelte";

    // (22:2) {#if bestseller}
    function create_if_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "best seller";
    			add_location(p, file, 22, 4, 408);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(22:2) {#if bestseller}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let article;
    	let h1;
    	let t0;
    	let t1;
    	let h2;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let button0;
    	let t7;
    	let button1;
    	let mounted;
    	let dispose;
    	let if_block = /*bestseller*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			article = element("article");
    			h1 = element("h1");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			h2 = element("h2");
    			t2 = text("$");
    			t3 = text(/*price*/ ctx[1]);
    			t4 = space();
    			if (if_block) if_block.c();
    			t5 = space();
    			button0 = element("button");
    			button0.textContent = "Add to cart";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Delete";
    			add_location(h1, file, 19, 2, 348);
    			add_location(h2, file, 20, 2, 367);
    			add_location(button0, file, 24, 2, 437);
    			add_location(button1, file, 25, 2, 489);
    			add_location(article, file, 18, 0, 336);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, h1);
    			append_dev(h1, t0);
    			append_dev(article, t1);
    			append_dev(article, h2);
    			append_dev(h2, t2);
    			append_dev(h2, t3);
    			append_dev(article, t4);
    			if (if_block) if_block.m(article, null);
    			append_dev(article, t5);
    			append_dev(article, button0);
    			append_dev(article, t7);
    			append_dev(article, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*addToCart*/ ctx[3], false, false, false),
    					listen_dev(button1, "click", /*deleteProduct*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);
    			if (dirty & /*price*/ 2) set_data_dev(t3, /*price*/ ctx[1]);

    			if (/*bestseller*/ ctx[2]) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(article, t5);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(article);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
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
    	let { title } = $$props;
    	let { price } = $$props;
    	let { bestseller = false } = $$props;
    	const dispatch = createEventDispatcher();

    	function addToCart() {
    		dispatch("add-to-cart", { title });
    	}

    	function deleteProduct() {
    		dispatch("delete-product", { title });
    	}

    	const writable_props = ["title", "price", "bestseller"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Product> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Product", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("price" in $$props) $$invalidate(1, price = $$props.price);
    		if ("bestseller" in $$props) $$invalidate(2, bestseller = $$props.bestseller);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		title,
    		price,
    		bestseller,
    		dispatch,
    		addToCart,
    		deleteProduct
    	});

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("price" in $$props) $$invalidate(1, price = $$props.price);
    		if ("bestseller" in $$props) $$invalidate(2, bestseller = $$props.bestseller);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, price, bestseller, addToCart, deleteProduct];
    }

    class Product extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { title: 0, price: 1, bestseller: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Product",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*title*/ ctx[0] === undefined && !("title" in props)) {
    			console.warn("<Product> was created without expected prop 'title'");
    		}

    		if (/*price*/ ctx[1] === undefined && !("price" in props)) {
    			console.warn("<Product> was created without expected prop 'price'");
    		}
    	}

    	get title() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get price() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set price(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bestseller() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bestseller(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function noop$1() { }
    function add_location$1(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run$1(fn) {
        return fn();
    }
    function blank_object$1() {
        return Object.create(null);
    }
    function run_all$1(fns) {
        fns.forEach(run$1);
    }
    function is_function$1(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal$1(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append$1(target, node) {
        target.appendChild(node);
    }
    function insert$1(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach$1(node) {
        node.parentNode.removeChild(node);
    }
    function element$1(name) {
        return document.createElement(name);
    }
    function text$1(data) {
        return document.createTextNode(data);
    }
    function space$1() {
        return text$1(' ');
    }
    function empty() {
        return text$1('');
    }
    function listen$1(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr$1(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children$1(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event$1(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component$1;
    function set_current_component$1(component) {
        current_component$1 = component;
    }

    const dirty_components$1 = [];
    const binding_callbacks$1 = [];
    const render_callbacks$1 = [];
    const flush_callbacks$1 = [];
    const resolved_promise$1 = Promise.resolve();
    let update_scheduled$1 = false;
    function schedule_update$1() {
        if (!update_scheduled$1) {
            update_scheduled$1 = true;
            resolved_promise$1.then(flush$1);
        }
    }
    function add_render_callback$1(fn) {
        render_callbacks$1.push(fn);
    }
    let flushing$1 = false;
    const seen_callbacks$1 = new Set();
    function flush$1() {
        if (flushing$1)
            return;
        flushing$1 = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components$1.length; i += 1) {
                const component = dirty_components$1[i];
                set_current_component$1(component);
                update$1(component.$$);
            }
            dirty_components$1.length = 0;
            while (binding_callbacks$1.length)
                binding_callbacks$1.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks$1.length; i += 1) {
                const callback = render_callbacks$1[i];
                if (!seen_callbacks$1.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks$1.add(callback);
                    callback();
                }
            }
            render_callbacks$1.length = 0;
        } while (dirty_components$1.length);
        while (flush_callbacks$1.length) {
            flush_callbacks$1.pop()();
        }
        update_scheduled$1 = false;
        flushing$1 = false;
        seen_callbacks$1.clear();
    }
    function update$1($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all$1($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback$1);
        }
    }
    const outroing$1 = new Set();
    let outros$1;
    function group_outros$1() {
        outros$1 = {
            r: 0,
            c: [],
            p: outros$1 // parent group
        };
    }
    function check_outros$1() {
        if (!outros$1.r) {
            run_all$1(outros$1.c);
        }
        outros$1 = outros$1.p;
    }
    function transition_in$1(block, local) {
        if (block && block.i) {
            outroing$1.delete(block);
            block.i(local);
        }
    }
    function transition_out$1(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing$1.has(block))
                return;
            outroing$1.add(block);
            outros$1.c.push(() => {
                outroing$1.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out$1(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in$1(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }
    function create_component$1(block) {
        block && block.c();
    }
    function mount_component$1(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback$1(() => {
            const new_on_destroy = on_mount.map(run$1).filter(is_function$1);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all$1(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback$1);
    }
    function destroy_component$1(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all$1($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty$1(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components$1.push(component);
            schedule_update$1();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init$1(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component$1;
        set_current_component$1(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop$1,
            not_equal,
            bound: blank_object$1(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object$1(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty$1(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all$1($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children$1(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach$1);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in$1(component.$$.fragment);
            mount_component$1(component, options.target, options.anchor);
            flush$1();
        }
        set_current_component$1(parent_component);
    }
    class SvelteComponent$1 {
        $destroy() {
            destroy_component$1(this, 1);
            this.$destroy = noop$1;
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev$1(type, detail) {
        document.dispatchEvent(custom_event$1(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev$1(target, node) {
        dispatch_dev$1("SvelteDOMInsert", { target, node });
        append$1(target, node);
    }
    function insert_dev$1(target, node, anchor) {
        dispatch_dev$1("SvelteDOMInsert", { target, node, anchor });
        insert$1(target, node, anchor);
    }
    function detach_dev$1(node) {
        dispatch_dev$1("SvelteDOMRemove", { node });
        detach$1(node);
    }
    function listen_dev$1(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev$1("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen$1(node, event, handler, options);
        return () => {
            dispatch_dev$1("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev$1(node, attribute, value) {
        attr$1(node, attribute, value);
        if (value == null)
            dispatch_dev$1("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev$1("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev$1(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev$1("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument$1(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots$1(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev$1 extends SvelteComponent$1 {
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

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/svelte-hello/src/ContactCard.svelte generated by Svelte v3.24.1 */

    const file$1 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/svelte-hello/src/ContactCard.svelte";

    function create_fragment$1(ctx) {
    	let div3;
    	let header;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let h1;
    	let t1;
    	let t2;
    	let h2;
    	let t3;
    	let t4;
    	let div2;
    	let p;
    	let t5;

    	const block = {
    		c: function create() {
    			div3 = element$1("div");
    			header = element$1("header");
    			div0 = element$1("div");
    			img = element$1("img");
    			t0 = space$1();
    			div1 = element$1("div");
    			h1 = element$1("h1");
    			t1 = text$1(/*userName*/ ctx[0]);
    			t2 = space$1();
    			h2 = element$1("h2");
    			t3 = text$1(/*jobTitle*/ ctx[1]);
    			t4 = space$1();
    			div2 = element$1("div");
    			p = element$1("p");
    			t5 = text$1(/*description*/ ctx[2]);
    			if (img.src !== (img_src_value = /*userImage*/ ctx[3])) attr_dev$1(img, "src", img_src_value);
    			attr_dev$1(img, "alt", /*userName*/ ctx[0]);
    			attr_dev$1(img, "class", "svelte-1q9dit7");
    			add_location$1(img, file$1, 69, 8, 1253);
    			attr_dev$1(div0, "class", "thumb svelte-1q9dit7");
    			toggle_class(div0, "thumb-placeholder", !/*userImage*/ ctx[3]);
    			add_location$1(div0, file$1, 68, 6, 1186);
    			attr_dev$1(h1, "class", "svelte-1q9dit7");
    			add_location$1(h1, file$1, 72, 8, 1343);
    			attr_dev$1(h2, "class", "svelte-1q9dit7");
    			add_location$1(h2, file$1, 73, 8, 1371);
    			attr_dev$1(div1, "class", "user-data svelte-1q9dit7");
    			add_location$1(div1, file$1, 71, 6, 1311);
    			attr_dev$1(header, "class", "svelte-1q9dit7");
    			add_location$1(header, file$1, 67, 4, 1171);
    			add_location$1(p, file$1, 77, 6, 1454);
    			attr_dev$1(div2, "class", "description svelte-1q9dit7");
    			add_location$1(div2, file$1, 76, 4, 1422);
    			attr_dev$1(div3, "class", "contact-card svelte-1q9dit7");
    			add_location$1(div3, file$1, 66, 2, 1140);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, div3, anchor);
    			append_dev$1(div3, header);
    			append_dev$1(header, div0);
    			append_dev$1(div0, img);
    			append_dev$1(header, t0);
    			append_dev$1(header, div1);
    			append_dev$1(div1, h1);
    			append_dev$1(h1, t1);
    			append_dev$1(div1, t2);
    			append_dev$1(div1, h2);
    			append_dev$1(h2, t3);
    			append_dev$1(div3, t4);
    			append_dev$1(div3, div2);
    			append_dev$1(div2, p);
    			append_dev$1(p, t5);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*userImage*/ 8 && img.src !== (img_src_value = /*userImage*/ ctx[3])) {
    				attr_dev$1(img, "src", img_src_value);
    			}

    			if (dirty & /*userName*/ 1) {
    				attr_dev$1(img, "alt", /*userName*/ ctx[0]);
    			}

    			if (dirty & /*userImage*/ 8) {
    				toggle_class(div0, "thumb-placeholder", !/*userImage*/ ctx[3]);
    			}

    			if (dirty & /*userName*/ 1) set_data_dev$1(t1, /*userName*/ ctx[0]);
    			if (dirty & /*jobTitle*/ 2) set_data_dev$1(t3, /*jobTitle*/ ctx[1]);
    			if (dirty & /*description*/ 4) set_data_dev$1(t5, /*description*/ ctx[2]);
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(div3);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { userName } = $$props;
    	let { jobTitle } = $$props;
    	let { description } = $$props;
    	let { userImage } = $$props;
    	const writable_props = ["userName", "jobTitle", "description", "userImage"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ContactCard> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("ContactCard", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("userName" in $$props) $$invalidate(0, userName = $$props.userName);
    		if ("jobTitle" in $$props) $$invalidate(1, jobTitle = $$props.jobTitle);
    		if ("description" in $$props) $$invalidate(2, description = $$props.description);
    		if ("userImage" in $$props) $$invalidate(3, userImage = $$props.userImage);
    	};

    	$$self.$capture_state = () => ({
    		userName,
    		jobTitle,
    		description,
    		userImage
    	});

    	$$self.$inject_state = $$props => {
    		if ("userName" in $$props) $$invalidate(0, userName = $$props.userName);
    		if ("jobTitle" in $$props) $$invalidate(1, jobTitle = $$props.jobTitle);
    		if ("description" in $$props) $$invalidate(2, description = $$props.description);
    		if ("userImage" in $$props) $$invalidate(3, userImage = $$props.userImage);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [userName, jobTitle, description, userImage];
    }

    class ContactCard extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);

    		init$1(this, options, instance$1, create_fragment$1, safe_not_equal$1, {
    			userName: 0,
    			jobTitle: 1,
    			description: 2,
    			userImage: 3
    		});

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ContactCard",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*userName*/ ctx[0] === undefined && !("userName" in props)) {
    			console.warn("<ContactCard> was created without expected prop 'userName'");
    		}

    		if (/*jobTitle*/ ctx[1] === undefined && !("jobTitle" in props)) {
    			console.warn("<ContactCard> was created without expected prop 'jobTitle'");
    		}

    		if (/*description*/ ctx[2] === undefined && !("description" in props)) {
    			console.warn("<ContactCard> was created without expected prop 'description'");
    		}

    		if (/*userImage*/ ctx[3] === undefined && !("userImage" in props)) {
    			console.warn("<ContactCard> was created without expected prop 'userImage'");
    		}
    	}

    	get userName() {
    		throw new Error("<ContactCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set userName(value) {
    		throw new Error("<ContactCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get jobTitle() {
    		throw new Error("<ContactCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set jobTitle(value) {
    		throw new Error("<ContactCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get description() {
    		throw new Error("<ContactCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<ContactCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get userImage() {
    		throw new Error("<ContactCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set userImage(value) {
    		throw new Error("<ContactCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/svelte-hello/src/App.svelte generated by Svelte v3.24.1 */
    const file$2 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/svelte-hello/src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[28] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	child_ctx[28] = i;
    	return child_ctx;
    }

    // (101:6) {#each passwords as pw, i (pw)}
    function create_each_block_1(key_1, ctx) {
    	let li;
    	let t_value = /*pw*/ ctx[29] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[15](/*i*/ ctx[28], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			li = element$1("li");
    			t = text$1(t_value);
    			add_location$1(li, file$2, 101, 8, 2181);
    			this.first = li;
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, li, anchor);
    			append_dev$1(li, t);

    			if (!mounted) {
    				dispose = listen_dev$1(li, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*passwords*/ 32 && t_value !== (t_value = /*pw*/ ctx[29] + "")) set_data_dev$1(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(101:6) {#each passwords as pw, i (pw)}",
    		ctx
    	});

    	return block;
    }

    // (133:0) {:else}
    function create_else_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element$1("p");
    			p.textContent = "Please enter some data and hit the button!";
    			add_location$1(p, file$2, 133, 2, 3072);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(p);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(133:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (131:0) {#if formState === 'invalid'}
    function create_if_block$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element$1("p");
    			p.textContent = "Invalid input.";
    			add_location$1(p, file$2, 131, 2, 3040);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(p);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(131:0) {#if formState === 'invalid'}",
    		ctx
    	});

    	return block;
    }

    // (144:0) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element$1("p");
    			p.textContent = "Please start adding some contacts!!!";
    			add_location$1(p, file$2, 144, 2, 3354);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(p);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(144:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (137:0) {#each createdContacts as contact, i (contact.id)}
    function create_each_block(key_1, ctx) {
    	let h2;
    	let t0;
    	let t1_value = /*i*/ ctx[28] + 1 + "";
    	let t1;
    	let t2;
    	let contactcard;
    	let current;

    	contactcard = new ContactCard({
    			props: {
    				userName: /*contact*/ ctx[26].name,
    				jobTitle: /*contact*/ ctx[26].title,
    				description: /*contact*/ ctx[26].description,
    				userImage: /*contact*/ ctx[26].image
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			h2 = element$1("h2");
    			t0 = text$1("# ");
    			t1 = text$1(t1_value);
    			t2 = space$1();
    			create_component$1(contactcard.$$.fragment);
    			add_location$1(h2, file$2, 137, 2, 3182);
    			this.first = h2;
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, h2, anchor);
    			append_dev$1(h2, t0);
    			append_dev$1(h2, t1);
    			insert_dev$1(target, t2, anchor);
    			mount_component$1(contactcard, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*createdContacts*/ 16) && t1_value !== (t1_value = /*i*/ ctx[28] + 1 + "")) set_data_dev$1(t1, t1_value);
    			const contactcard_changes = {};
    			if (dirty & /*createdContacts*/ 16) contactcard_changes.userName = /*contact*/ ctx[26].name;
    			if (dirty & /*createdContacts*/ 16) contactcard_changes.jobTitle = /*contact*/ ctx[26].title;
    			if (dirty & /*createdContacts*/ 16) contactcard_changes.description = /*contact*/ ctx[26].description;
    			if (dirty & /*createdContacts*/ 16) contactcard_changes.userImage = /*contact*/ ctx[26].image;
    			contactcard.$set(contactcard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(contactcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(contactcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(h2);
    			if (detaching) detach_dev$1(t2);
    			destroy_component$1(contactcard, detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(137:0) {#each createdContacts as contact, i (contact.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div1;
    	let div0;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let p;
    	let t3_value = (/*passwordValidation*/ ctx[7].length && /*passwordValidation*/ ctx[7][0]) + "";
    	let t3;
    	let t4;
    	let button0;
    	let t6;
    	let ul;
    	let each_blocks_1 = [];
    	let each0_lookup = new Map();
    	let t7;
    	let div6;
    	let div2;
    	let label1;
    	let t9;
    	let input1;
    	let t10;
    	let div3;
    	let label2;
    	let t12;
    	let input2;
    	let t13;
    	let div4;
    	let label3;
    	let t15;
    	let input3;
    	let t16;
    	let div5;
    	let label4;
    	let t18;
    	let textarea;
    	let textarea_rows_value;
    	let t19;
    	let button1;
    	let t21;
    	let button2;
    	let t23;
    	let button3;
    	let t25;
    	let t26;
    	let each_blocks = [];
    	let each1_lookup = new Map();
    	let each1_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*passwords*/ ctx[5];
    	validate_each_argument$1(each_value_1);
    	const get_key = ctx => /*pw*/ ctx[29];
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*formState*/ ctx[8] === "invalid") return create_if_block$1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);
    	let each_value = /*createdContacts*/ ctx[4];
    	validate_each_argument$1(each_value);
    	const get_key_1 = ctx => /*contact*/ ctx[26].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key_1);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let each1_else = null;

    	if (!each_value.length) {
    		each1_else = create_else_block(ctx);
    	}

    	const block = {
    		c: function create() {
    			div1 = element$1("div");
    			div0 = element$1("div");
    			label0 = element$1("label");
    			label0.textContent = "Password";
    			t1 = space$1();
    			input0 = element$1("input");
    			t2 = space$1();
    			p = element$1("p");
    			t3 = text$1(t3_value);
    			t4 = space$1();
    			button0 = element$1("button");
    			button0.textContent = "Add Password";
    			t6 = space$1();
    			ul = element$1("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t7 = space$1();
    			div6 = element$1("div");
    			div2 = element$1("div");
    			label1 = element$1("label");
    			label1.textContent = "User Name";
    			t9 = space$1();
    			input1 = element$1("input");
    			t10 = space$1();
    			div3 = element$1("div");
    			label2 = element$1("label");
    			label2.textContent = "Job Title";
    			t12 = space$1();
    			input2 = element$1("input");
    			t13 = space$1();
    			div4 = element$1("div");
    			label3 = element$1("label");
    			label3.textContent = "Image URL";
    			t15 = space$1();
    			input3 = element$1("input");
    			t16 = space$1();
    			div5 = element$1("div");
    			label4 = element$1("label");
    			label4.textContent = "Description";
    			t18 = space$1();
    			textarea = element$1("textarea");
    			t19 = space$1();
    			button1 = element$1("button");
    			button1.textContent = "Add Contact";
    			t21 = space$1();
    			button2 = element$1("button");
    			button2.textContent = "Delete First";
    			t23 = space$1();
    			button3 = element$1("button");
    			button3.textContent = "Delete Last";
    			t25 = space$1();
    			if_block.c();
    			t26 = space$1();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();

    			if (each1_else) {
    				each1_else.c();
    			}

    			attr_dev$1(label0, "for", "password");
    			add_location$1(label0, file$2, 95, 4, 1890);
    			attr_dev$1(input0, "type", "text");
    			attr_dev$1(input0, "id", "currentPassword");
    			add_location$1(input0, file$2, 96, 4, 1933);
    			add_location$1(p, file$2, 97, 4, 2009);
    			add_location$1(button0, file$2, 98, 4, 2073);
    			add_location$1(ul, file$2, 99, 4, 2130);
    			attr_dev$1(div0, "class", "form-control");
    			add_location$1(div0, file$2, 94, 2, 1859);
    			attr_dev$1(div1, "id", "form1");
    			attr_dev$1(div1, "class", "svelte-gwk4ma");
    			add_location$1(div1, file$2, 93, 0, 1840);
    			attr_dev$1(label1, "for", "userName");
    			add_location$1(label1, file$2, 109, 4, 2320);
    			attr_dev$1(input1, "type", "text");
    			attr_dev$1(input1, "id", "userName");
    			add_location$1(input1, file$2, 110, 4, 2364);
    			attr_dev$1(div2, "class", "form-control");
    			add_location$1(div2, file$2, 108, 2, 2289);
    			attr_dev$1(label2, "for", "jobTitle");
    			add_location$1(label2, file$2, 113, 4, 2460);
    			attr_dev$1(input2, "type", "text");
    			attr_dev$1(input2, "id", "jobTitle");
    			add_location$1(input2, file$2, 114, 4, 2504);
    			attr_dev$1(div3, "class", "form-control");
    			add_location$1(div3, file$2, 112, 2, 2429);
    			attr_dev$1(label3, "for", "image");
    			add_location$1(label3, file$2, 117, 4, 2601);
    			attr_dev$1(input3, "type", "text");
    			attr_dev$1(input3, "id", "image");
    			add_location$1(input3, file$2, 118, 4, 2642);
    			attr_dev$1(div4, "class", "form-control");
    			add_location$1(div4, file$2, 116, 2, 2570);
    			attr_dev$1(label4, "for", "desc");
    			add_location$1(label4, file$2, 121, 4, 2736);
    			attr_dev$1(textarea, "rows", textarea_rows_value = 3);
    			attr_dev$1(textarea, "id", "desc");
    			add_location$1(textarea, file$2, 122, 4, 2778);
    			attr_dev$1(div5, "class", "form-control");
    			add_location$1(div5, file$2, 120, 2, 2705);
    			attr_dev$1(div6, "id", "form");
    			attr_dev$1(div6, "class", "svelte-gwk4ma");
    			add_location$1(div6, file$2, 107, 0, 2271);
    			add_location$1(button1, file$2, 126, 0, 2852);
    			add_location$1(button2, file$2, 127, 0, 2903);
    			add_location$1(button3, file$2, 128, 0, 2956);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, div1, anchor);
    			append_dev$1(div1, div0);
    			append_dev$1(div0, label0);
    			append_dev$1(div0, t1);
    			append_dev$1(div0, input0);
    			set_input_value(input0, /*currentPassword*/ ctx[6]);
    			append_dev$1(div0, t2);
    			append_dev$1(div0, p);
    			append_dev$1(p, t3);
    			append_dev$1(div0, t4);
    			append_dev$1(div0, button0);
    			append_dev$1(div0, t6);
    			append_dev$1(div0, ul);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul, null);
    			}

    			insert_dev$1(target, t7, anchor);
    			insert_dev$1(target, div6, anchor);
    			append_dev$1(div6, div2);
    			append_dev$1(div2, label1);
    			append_dev$1(div2, t9);
    			append_dev$1(div2, input1);
    			set_input_value(input1, /*name*/ ctx[0]);
    			append_dev$1(div6, t10);
    			append_dev$1(div6, div3);
    			append_dev$1(div3, label2);
    			append_dev$1(div3, t12);
    			append_dev$1(div3, input2);
    			set_input_value(input2, /*title*/ ctx[2]);
    			append_dev$1(div6, t13);
    			append_dev$1(div6, div4);
    			append_dev$1(div4, label3);
    			append_dev$1(div4, t15);
    			append_dev$1(div4, input3);
    			set_input_value(input3, /*image*/ ctx[3]);
    			append_dev$1(div6, t16);
    			append_dev$1(div6, div5);
    			append_dev$1(div5, label4);
    			append_dev$1(div5, t18);
    			append_dev$1(div5, textarea);
    			set_input_value(textarea, /*description*/ ctx[1]);
    			insert_dev$1(target, t19, anchor);
    			insert_dev$1(target, button1, anchor);
    			insert_dev$1(target, t21, anchor);
    			insert_dev$1(target, button2, anchor);
    			insert_dev$1(target, t23, anchor);
    			insert_dev$1(target, button3, anchor);
    			insert_dev$1(target, t25, anchor);
    			if_block.m(target, anchor);
    			insert_dev$1(target, t26, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev$1(target, each1_anchor, anchor);

    			if (each1_else) {
    				each1_else.m(target, anchor);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev$1(input0, "input", /*input0_input_handler*/ ctx[14]),
    					listen_dev$1(button0, "click", /*addPassword*/ ctx[9], false, false, false),
    					listen_dev$1(input1, "input", /*input1_input_handler*/ ctx[16]),
    					listen_dev$1(input2, "input", /*input2_input_handler*/ ctx[17]),
    					listen_dev$1(input3, "input", /*input3_input_handler*/ ctx[18]),
    					listen_dev$1(textarea, "input", /*textarea_input_handler*/ ctx[19]),
    					listen_dev$1(button1, "click", /*addContact*/ ctx[11], false, false, false),
    					listen_dev$1(button2, "click", /*deleteFirst*/ ctx[12], false, false, false),
    					listen_dev$1(button3, "click", /*deleteLast*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentPassword*/ 64 && input0.value !== /*currentPassword*/ ctx[6]) {
    				set_input_value(input0, /*currentPassword*/ ctx[6]);
    			}

    			if ((!current || dirty & /*passwordValidation*/ 128) && t3_value !== (t3_value = (/*passwordValidation*/ ctx[7].length && /*passwordValidation*/ ctx[7][0]) + "")) set_data_dev$1(t3, t3_value);

    			if (dirty & /*deletePassword, passwords*/ 1056) {
    				const each_value_1 = /*passwords*/ ctx[5];
    				validate_each_argument$1(each_value_1);
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, ul, destroy_block, create_each_block_1, null, get_each_context_1);
    			}

    			if (dirty & /*name*/ 1 && input1.value !== /*name*/ ctx[0]) {
    				set_input_value(input1, /*name*/ ctx[0]);
    			}

    			if (dirty & /*title*/ 4 && input2.value !== /*title*/ ctx[2]) {
    				set_input_value(input2, /*title*/ ctx[2]);
    			}

    			if (dirty & /*image*/ 8 && input3.value !== /*image*/ ctx[3]) {
    				set_input_value(input3, /*image*/ ctx[3]);
    			}

    			if (dirty & /*description*/ 2) {
    				set_input_value(textarea, /*description*/ ctx[1]);
    			}

    			if (dirty & /*createdContacts*/ 16) {
    				const each_value = /*createdContacts*/ ctx[4];
    				validate_each_argument$1(each_value);
    				group_outros$1();
    				validate_each_keys(ctx, each_value, get_each_context, get_key_1);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, each1_anchor.parentNode, outro_and_destroy_block, create_each_block, each1_anchor, get_each_context);
    				check_outros$1();

    				if (each_value.length) {
    					if (each1_else) {
    						each1_else.d(1);
    						each1_else = null;
    					}
    				} else if (!each1_else) {
    					each1_else = create_else_block(ctx);
    					each1_else.c();
    					each1_else.m(each1_anchor.parentNode, each1_anchor);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in$1(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out$1(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(div1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			if (detaching) detach_dev$1(t7);
    			if (detaching) detach_dev$1(div6);
    			if (detaching) detach_dev$1(t19);
    			if (detaching) detach_dev$1(button1);
    			if (detaching) detach_dev$1(t21);
    			if (detaching) detach_dev$1(button2);
    			if (detaching) detach_dev$1(t23);
    			if (detaching) detach_dev$1(button3);
    			if (detaching) detach_dev$1(t25);
    			if_block.d(detaching);
    			if (detaching) detach_dev$1(t26);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev$1(each1_anchor);
    			if (each1_else) each1_else.d(detaching);
    			mounted = false;
    			run_all$1(dispose);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let name = "NamNDH";
    	let age = 33;
    	let description = "";
    	let title = "";
    	let image = "";

    	// let courseGoal = ""
    	let done = false;

    	let formState = "empty";
    	let createdContacts = [];
    	let passwords = [];
    	let currentPassword = "";
    	let passwordValidation = [];

    	function incrementAge() {
    		age += 1;
    	}

    	function changeName() {
    		$$invalidate(0, name = "namndh");
    	}

    	function nameInput(event) {
    		$$invalidate(0, name = event.target.value);
    	}

    	function addPassword() {
    		const [message, validation] = passwordValidation;

    		if (validation) {
    			$$invalidate(5, passwords = [...passwords, currentPassword]);
    			$$invalidate(6, currentPassword = "");
    		}
    	}

    	function deletePassword(index) {
    		$$invalidate(5, passwords = passwords.filter((pw, i) => pw && i !== index));
    	}

    	function addContact() {
    		if (name.trim().length == 0 || title.trim().length == 0 || image.trim().length == 0 || description.trim().length == 0) {
    			return;
    		}

    		const createdContact = {
    			id: Math.random(),
    			name,
    			title,
    			image,
    			description
    		};

    		$$invalidate(4, createdContacts = [...createdContacts, createdContact]);
    	}

    	function deleteFirst() {
    		$$invalidate(4, createdContacts = createdContacts.slice(1));
    	}

    	function deleteLast() {
    		$$invalidate(4, createdContacts = createdContacts.slice(0, -1));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("App", $$slots, []);

    	function input0_input_handler() {
    		currentPassword = this.value;
    		$$invalidate(6, currentPassword);
    	}

    	const click_handler = i => deletePassword(i);

    	function input1_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function input2_input_handler() {
    		title = this.value;
    		$$invalidate(2, title);
    	}

    	function input3_input_handler() {
    		image = this.value;
    		$$invalidate(3, image);
    	}

    	function textarea_input_handler() {
    		description = this.value;
    		$$invalidate(1, description);
    	}

    	$$self.$capture_state = () => ({
    		ContactCard,
    		name,
    		age,
    		description,
    		title,
    		image,
    		done,
    		formState,
    		createdContacts,
    		passwords,
    		currentPassword,
    		passwordValidation,
    		incrementAge,
    		changeName,
    		nameInput,
    		addPassword,
    		deletePassword,
    		addContact,
    		deleteFirst,
    		deleteLast,
    		uppercaseName
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("age" in $$props) age = $$props.age;
    		if ("description" in $$props) $$invalidate(1, description = $$props.description);
    		if ("title" in $$props) $$invalidate(2, title = $$props.title);
    		if ("image" in $$props) $$invalidate(3, image = $$props.image);
    		if ("done" in $$props) done = $$props.done;
    		if ("formState" in $$props) $$invalidate(8, formState = $$props.formState);
    		if ("createdContacts" in $$props) $$invalidate(4, createdContacts = $$props.createdContacts);
    		if ("passwords" in $$props) $$invalidate(5, passwords = $$props.passwords);
    		if ("currentPassword" in $$props) $$invalidate(6, currentPassword = $$props.currentPassword);
    		if ("passwordValidation" in $$props) $$invalidate(7, passwordValidation = $$props.passwordValidation);
    		if ("uppercaseName" in $$props) uppercaseName = $$props.uppercaseName;
    	};

    	let uppercaseName;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*name*/ 1) {
    			 uppercaseName = name.toUpperCase();
    		}

    		if ($$self.$$.dirty & /*currentPassword*/ 64) {
    			 $$invalidate(7, passwordValidation = currentPassword.trim().length < 5
    			? ["Too short", false]
    			: currentPassword.trim().length > 10
    				? ["Too long", false]
    				: [currentPassword.trim(), true]);
    		}
    	};

    	return [
    		name,
    		description,
    		title,
    		image,
    		createdContacts,
    		passwords,
    		currentPassword,
    		passwordValidation,
    		formState,
    		addPassword,
    		deletePassword,
    		addContact,
    		deleteFirst,
    		deleteLast,
    		input0_input_handler,
    		click_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		textarea_input_handler
    	];
    }

    class App extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$2, create_fragment$2, safe_not_equal$1, {});

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    function noop$2() { }
    function add_location$2(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run$2(fn) {
        return fn();
    }
    function blank_object$2() {
        return Object.create(null);
    }
    function run_all$2(fns) {
        fns.forEach(run$2);
    }
    function is_function$2(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal$2(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty$1(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append$2(target, node) {
        target.appendChild(node);
    }
    function insert$2(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach$2(node) {
        node.parentNode.removeChild(node);
    }
    function element$2(name) {
        return document.createElement(name);
    }
    function text$2(data) {
        return document.createTextNode(data);
    }
    function empty$1() {
        return text$2('');
    }
    function listen$2(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr$2(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children$2(element) {
        return Array.from(element.childNodes);
    }
    function custom_event$2(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component$2;
    function set_current_component$2(component) {
        current_component$2 = component;
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

    const dirty_components$2 = [];
    const binding_callbacks$2 = [];
    const render_callbacks$2 = [];
    const flush_callbacks$2 = [];
    const resolved_promise$2 = Promise.resolve();
    let update_scheduled$2 = false;
    function schedule_update$2() {
        if (!update_scheduled$2) {
            update_scheduled$2 = true;
            resolved_promise$2.then(flush$2);
        }
    }
    function add_render_callback$2(fn) {
        render_callbacks$2.push(fn);
    }
    let flushing$2 = false;
    const seen_callbacks$2 = new Set();
    function flush$2() {
        if (flushing$2)
            return;
        flushing$2 = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components$2.length; i += 1) {
                const component = dirty_components$2[i];
                set_current_component$2(component);
                update$2(component.$$);
            }
            dirty_components$2.length = 0;
            while (binding_callbacks$2.length)
                binding_callbacks$2.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks$2.length; i += 1) {
                const callback = render_callbacks$2[i];
                if (!seen_callbacks$2.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks$2.add(callback);
                    callback();
                }
            }
            render_callbacks$2.length = 0;
        } while (dirty_components$2.length);
        while (flush_callbacks$2.length) {
            flush_callbacks$2.pop()();
        }
        update_scheduled$2 = false;
        flushing$2 = false;
        seen_callbacks$2.clear();
    }
    function update$2($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all$2($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback$2);
        }
    }
    const outroing$2 = new Set();
    function transition_in$2(block, local) {
        if (block && block.i) {
            outroing$2.delete(block);
            block.i(local);
        }
    }
    function mount_component$2(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback$2(() => {
            const new_on_destroy = on_mount.map(run$2).filter(is_function$2);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all$2(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback$2);
    }
    function destroy_component$2(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all$2($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty$2(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components$2.push(component);
            schedule_update$2();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init$2(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component$2;
        set_current_component$2(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop$2,
            not_equal,
            bound: blank_object$2(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object$2(),
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
                        make_dirty$2(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all$2($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children$2(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach$2);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in$2(component.$$.fragment);
            mount_component$2(component, options.target, options.anchor);
            flush$2();
        }
        set_current_component$2(parent_component);
    }
    class SvelteComponent$2 {
        $destroy() {
            destroy_component$2(this, 1);
            this.$destroy = noop$2;
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
            if (this.$$set && !is_empty$1($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev$2(type, detail) {
        document.dispatchEvent(custom_event$2(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev$2(target, node) {
        dispatch_dev$2("SvelteDOMInsert", { target, node });
        append$2(target, node);
    }
    function insert_dev$2(target, node, anchor) {
        dispatch_dev$2("SvelteDOMInsert", { target, node, anchor });
        insert$2(target, node, anchor);
    }
    function detach_dev$2(node) {
        dispatch_dev$2("SvelteDOMRemove", { node });
        detach$2(node);
    }
    function listen_dev$2(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev$2("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen$2(node, event, handler, options);
        return () => {
            dispatch_dev$2("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev$2(node, attribute, value) {
        attr$2(node, attribute, value);
        if (value == null)
            dispatch_dev$2("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev$2("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev$2(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev$2("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots$2(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev$2 extends SvelteComponent$2 {
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

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/Button.svelte generated by Svelte v3.24.1 */

    const file$3 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/Button.svelte";

    // (88:0) {:else}
    function create_else_block$1(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element$2("button");
    			t = text$2(/*caption*/ ctx[1]);
    			attr_dev$2(button, "class", button_class_value = "" + (null_to_empty(/*mode*/ ctx[3]) + " svelte-g32zaw"));
    			attr_dev$2(button, "type", /*type*/ ctx[0]);
    			add_location$2(button, file$3, 88, 2, 1449);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$2(target, button, anchor);
    			append_dev$2(button, t);

    			if (!mounted) {
    				dispose = listen_dev$2(button, "click", /*click_handler*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*caption*/ 2) set_data_dev$2(t, /*caption*/ ctx[1]);

    			if (dirty & /*mode*/ 8 && button_class_value !== (button_class_value = "" + (null_to_empty(/*mode*/ ctx[3]) + " svelte-g32zaw"))) {
    				attr_dev$2(button, "class", button_class_value);
    			}

    			if (dirty & /*type*/ 1) {
    				attr_dev$2(button, "type", /*type*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$2(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev$2("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(88:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (86:0) {#if href}
    function create_if_block$2(ctx) {
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			a = element$2("a");
    			t = text$2(/*caption*/ ctx[1]);
    			attr_dev$2(a, "href", /*href*/ ctx[2]);
    			attr_dev$2(a, "class", "svelte-g32zaw");
    			add_location$2(a, file$3, 86, 2, 1415);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$2(target, a, anchor);
    			append_dev$2(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*caption*/ 2) set_data_dev$2(t, /*caption*/ ctx[1]);

    			if (dirty & /*href*/ 4) {
    				attr_dev$2(a, "href", /*href*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$2(a);
    		}
    	};

    	dispatch_dev$2("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(86:0) {#if href}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*href*/ ctx[2]) return create_if_block$2;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty$1();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev$2(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop$2,
    		o: noop$2,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev$2(if_block_anchor);
    		}
    	};

    	dispatch_dev$2("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { type } = $$props;
    	let { caption } = $$props;
    	let { href } = $$props;
    	let { mode } = $$props;
    	const writable_props = ["type", "caption", "href", "mode"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$2("Button", $$slots, []);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    		if ("caption" in $$props) $$invalidate(1, caption = $$props.caption);
    		if ("href" in $$props) $$invalidate(2, href = $$props.href);
    		if ("mode" in $$props) $$invalidate(3, mode = $$props.mode);
    	};

    	$$self.$capture_state = () => ({ type, caption, href, mode });

    	$$self.$inject_state = $$props => {
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    		if ("caption" in $$props) $$invalidate(1, caption = $$props.caption);
    		if ("href" in $$props) $$invalidate(2, href = $$props.href);
    		if ("mode" in $$props) $$invalidate(3, mode = $$props.mode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [type, caption, href, mode, click_handler];
    }

    class Button extends SvelteComponentDev$2 {
    	constructor(options) {
    		super(options);
    		init$2(this, options, instance$3, create_fragment$3, safe_not_equal$2, { type: 0, caption: 1, href: 2, mode: 3 });

    		dispatch_dev$2("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*type*/ ctx[0] === undefined && !("type" in props)) {
    			console.warn("<Button> was created without expected prop 'type'");
    		}

    		if (/*caption*/ ctx[1] === undefined && !("caption" in props)) {
    			console.warn("<Button> was created without expected prop 'caption'");
    		}

    		if (/*href*/ ctx[2] === undefined && !("href" in props)) {
    			console.warn("<Button> was created without expected prop 'href'");
    		}

    		if (/*mode*/ ctx[3] === undefined && !("mode" in props)) {
    			console.warn("<Button> was created without expected prop 'mode'");
    		}
    	}

    	get type() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get caption() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set caption(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mode() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mode(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Modal.svelte generated by Svelte v3.24.1 */

    const { console: console_1 } = globals;

    const file$4 = "src/Modal.svelte";
    const get_footer_slot_changes = dirty => ({ didAgree: dirty & /*agreed*/ 1 });
    const get_footer_slot_context = ctx => ({ didAgree: /*agreed*/ ctx[0] });
    const get_header_slot_changes = dirty => ({});
    const get_header_slot_context = ctx => ({});

    // (73:42)        
    function fallback_block(ctx) {
    	let button;
    	let t;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("Close");
    			button.disabled = button_disabled_value = !/*agreed*/ ctx[0];
    			add_location(button, file$4, 73, 6, 1448);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*agreed*/ 1 && button_disabled_value !== (button_disabled_value = !/*agreed*/ ctx[0])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(73:42)        ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div0;
    	let t0;
    	let div3;
    	let header;
    	let t1;
    	let div1;
    	let t2;
    	let div2;
    	let p;
    	let t4;
    	let button;
    	let t6;
    	let footer;
    	let current;
    	let mounted;
    	let dispose;
    	const header_slot_template = /*$$slots*/ ctx[3].header;
    	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[2], get_header_slot_context);
    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);
    	const footer_slot_template = /*$$slots*/ ctx[3].footer;
    	const footer_slot = create_slot(footer_slot_template, ctx, /*$$scope*/ ctx[2], get_footer_slot_context);
    	const footer_slot_or_fallback = footer_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div3 = element("div");
    			header = element("header");
    			if (header_slot) header_slot.c();
    			t1 = space();
    			div1 = element("div");
    			if (default_slot) default_slot.c();
    			t2 = space();
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Before close, agree with our terms";
    			t4 = space();
    			button = element("button");
    			button.textContent = "Agree";
    			t6 = space();
    			footer = element("footer");
    			if (footer_slot_or_fallback) footer_slot_or_fallback.c();
    			attr_dev(div0, "class", "backdrop svelte-b2hlcq");
    			add_location(div0, file$4, 58, 0, 1068);
    			add_location(header, file$4, 61, 2, 1152);
    			attr_dev(div1, "class", "content");
    			add_location(div1, file$4, 64, 2, 1202);
    			add_location(p, file$4, 68, 4, 1277);
    			add_location(button, file$4, 69, 4, 1323);
    			attr_dev(div2, "class", "disclaimer");
    			add_location(div2, file$4, 67, 2, 1248);
    			add_location(footer, file$4, 71, 2, 1390);
    			attr_dev(div3, "class", "modal svelte-b2hlcq");
    			add_location(div3, file$4, 60, 0, 1130);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, header);

    			if (header_slot) {
    				header_slot.m(header, null);
    			}

    			append_dev(div3, t1);
    			append_dev(div3, div1);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(div2, t4);
    			append_dev(div2, button);
    			append_dev(div3, t6);
    			append_dev(div3, footer);

    			if (footer_slot_or_fallback) {
    				footer_slot_or_fallback.m(footer, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*click_handler*/ ctx[4], false, false, false),
    					listen_dev(button, "click", /*click_handler_1*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (header_slot) {
    				if (header_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(header_slot, header_slot_template, ctx, /*$$scope*/ ctx[2], dirty, get_header_slot_changes, get_header_slot_context);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (footer_slot) {
    				if (footer_slot.p && dirty & /*$$scope, agreed*/ 5) {
    					update_slot(footer_slot, footer_slot_template, ctx, /*$$scope*/ ctx[2], dirty, get_footer_slot_changes, get_footer_slot_context);
    				}
    			} else {
    				if (footer_slot_or_fallback && footer_slot_or_fallback.p && dirty & /*agreed*/ 1) {
    					footer_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header_slot, local);
    			transition_in(default_slot, local);
    			transition_in(footer_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header_slot, local);
    			transition_out(default_slot, local);
    			transition_out(footer_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			if (header_slot) header_slot.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			if (footer_slot_or_fallback) footer_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let agreed = false;
    	let autoscroll = false;
    	onMount(() => console.log("onMount!"));
    	onDestroy(() => console.log("onDestroy!"));

    	beforeUpdate(() => {
    		console.log("before update");
    		autoscroll = agreed;
    	});

    	afterUpdate(() => {
    		console.log("after update");

    		if (autoscroll) {
    			const modal = document.querySelector(".modal");
    			modal.scrollTo(0, modal.scrollHeight);
    		}
    	});

    	console.log("script executed!!!");
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Modal", $$slots, ['header','default','footer']);
    	const click_handler = () => dispatch("cancel");
    	const click_handler_1 = () => $$invalidate(0, agreed = true);
    	const click_handler_2 = () => dispatch("close");

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onMount,
    		onDestroy,
    		beforeUpdate,
    		afterUpdate,
    		dispatch,
    		agreed,
    		autoscroll
    	});

    	$$self.$inject_state = $$props => {
    		if ("agreed" in $$props) $$invalidate(0, agreed = $$props.agreed);
    		if ("autoscroll" in $$props) autoscroll = $$props.autoscroll;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		agreed,
    		dispatch,
    		$$scope,
    		$$slots,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.1 */

    const { console: console_1$1 } = globals;
    const file$5 = "src/App.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (61:0) {#each products as product}
    function create_each_block$1(ctx) {
    	let product;
    	let current;
    	const product_spread_levels = [/*product*/ ctx[9]];
    	let product_props = {};

    	for (let i = 0; i < product_spread_levels.length; i += 1) {
    		product_props = assign(product_props, product_spread_levels[i]);
    	}

    	product = new Product({ props: product_props, $$inline: true });
    	product.$on("add-to-cart", addToCart);
    	product.$on("delete-product", deleteProduct);

    	const block = {
    		c: function create() {
    			create_component(product.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(product, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const product_changes = (dirty & /*products*/ 4)
    			? get_spread_update(product_spread_levels, [get_spread_object(/*product*/ ctx[9])])
    			: {};

    			product.$set(product_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(product, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(61:0) {#each products as product}",
    		ctx
    	});

    	return block;
    }

    // (70:0) {#if showModal}
    function create_if_block$3(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: {
    					default: [
    						create_default_slot,
    						({ didAgree: closeable }) => ({ 4: closeable }),
    						({ didAgree: closeable }) => closeable ? 16 : 0
    					],
    					footer: [
    						create_footer_slot,
    						({ didAgree: closeable }) => ({ 4: closeable }),
    						({ didAgree: closeable }) => closeable ? 16 : 0
    					],
    					header: [
    						create_header_slot,
    						({ didAgree: closeable }) => ({ 4: closeable }),
    						({ didAgree: closeable }) => closeable ? 16 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	modal.$on("cancel", /*cancel_handler*/ ctx[7]);
    	modal.$on("close", /*close_handler*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, closeable, showModal*/ 4113) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(70:0) {#if showModal}",
    		ctx
    	});

    	return block;
    }

    // (75:4) <h1 slot="header">
    function create_header_slot(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Hello Modal";
    			attr_dev(h1, "slot", "header");
    			add_location(h1, file$5, 74, 4, 1706);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_header_slot.name,
    		type: "slot",
    		source: "(75:4) <h1 slot=\\\"header\\\">",
    		ctx
    	});

    	return block;
    }

    // (77:4) <button       slot="footer"       on:click={() => (showModal = false)}       disabled={!closeable}>
    function create_footer_slot(ctx) {
    	let button;
    	let t;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("Confirm");
    			attr_dev(button, "slot", "footer");
    			button.disabled = button_disabled_value = !/*closeable*/ ctx[4];
    			add_location(button, file$5, 76, 4, 1782);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*closeable*/ 16 && button_disabled_value !== (button_disabled_value = !/*closeable*/ ctx[4])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_footer_slot.name,
    		type: "slot",
    		source: "(77:4) <button       slot=\\\"footer\\\"       on:click={() => (showModal = false)}       disabled={!closeable}>",
    		ctx
    	});

    	return block;
    }

    // (71:2) <Modal     on:cancel={() => (showModal = false)}     on:close={() => (showModal = false)}     let:didAgree={closeable}>
    function create_default_slot(ctx) {
    	let t0;
    	let div;
    	let t2;

    	const block = {
    		c: function create() {
    			t0 = space();
    			div = element("div");
    			div.textContent = "This is Modal content";
    			t2 = space();
    			add_location(div, file$5, 75, 4, 1745);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(71:2) <Modal     on:cancel={() => (showModal = false)}     on:close={() => (showModal = false)}     let:didAgree={closeable}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let t0;
    	let button;
    	let t2;
    	let t3;
    	let textarea;
    	let textarea_rows_value;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*products*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block = /*showModal*/ ctx[0] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			button = element("button");
    			button.textContent = "Show Modal";
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			textarea = element("textarea");
    			add_location(button, file$5, 67, 0, 1499);
    			attr_dev(textarea, "name", "test123");
    			attr_dev(textarea, "id", "test123");
    			attr_dev(textarea, "rows", textarea_rows_value = 3);
    			textarea.value = /*text*/ ctx[1];
    			add_location(textarea, file$5, 85, 0, 1928);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, textarea, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*click_handler*/ ctx[5], false, false, false),
    					listen_dev(textarea, "keydown", /*transform*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*products, addToCart, deleteProduct*/ 4) {
    				each_value = /*products*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t0.parentNode, t0);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*showModal*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showModal*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t3.parentNode, t3);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*text*/ 2) {
    				prop_dev(textarea, "value", /*text*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t2);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(textarea);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function addToCart(event) {
    	console.log(event);
    }

    function deleteProduct(event) {
    	console.log(event);
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let products = [
    		{
    			id: "p1",
    			title: "Harry Potter",
    			price: 9.99
    		},
    		{
    			id: "p2",
    			title: "Game of thrones",
    			price: 19.99
    		},
    		{
    			id: "p3",
    			title: "The Lord of the Rings",
    			price: 29.99
    		}
    	];

    	let showModal = false;
    	let closeable = false;
    	let text = "I want to transform this text!";

    	function transform(event) {
    		if (event.which !== 9) {
    			return; // tab key
    		}

    		event.preventDefault();
    		const selectionStart = event.target.selectionStart;
    		const selectionEnd = event.target.selectionEnd;
    		const value = event.target.value;
    		$$invalidate(1, text = value.slice(0, selectionStart) + value.slice(selectionStart, selectionEnd).toUpperCase() + value.slice(selectionEnd));

    		tick().then(() => {
    			event.target.selectionStart = selectionStart;
    			event.target.selectionEnd = selectionEnd;
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => $$invalidate(0, showModal = true);
    	const click_handler_1 = () => $$invalidate(0, showModal = false);
    	const cancel_handler = () => $$invalidate(0, showModal = false);
    	const close_handler = () => $$invalidate(0, showModal = false);

    	$$self.$capture_state = () => ({
    		tick,
    		Product,
    		App,
    		Button,
    		ContactCard,
    		Modal,
    		products,
    		showModal,
    		closeable,
    		text,
    		addToCart,
    		deleteProduct,
    		transform
    	});

    	$$self.$inject_state = $$props => {
    		if ("products" in $$props) $$invalidate(2, products = $$props.products);
    		if ("showModal" in $$props) $$invalidate(0, showModal = $$props.showModal);
    		if ("closeable" in $$props) $$invalidate(4, closeable = $$props.closeable);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		showModal,
    		text,
    		products,
    		transform,
    		closeable,
    		click_handler,
    		click_handler_1,
    		cancel_handler,
    		close_handler
    	];
    }

    class App_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App_1",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    const app = new App_1({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
