
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
    function empty() {
        return text('');
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
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
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
            transition_in(block, 1);
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
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

    /* src/ContactCard.svelte generated by Svelte v3.24.0 */

    const file = "src/ContactCard.svelte";

    function create_fragment(ctx) {
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
    			div3 = element("div");
    			header = element("header");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t1 = text(/*userName*/ ctx[0]);
    			t2 = space();
    			h2 = element("h2");
    			t3 = text(/*jobTitle*/ ctx[1]);
    			t4 = space();
    			div2 = element("div");
    			p = element("p");
    			t5 = text(/*description*/ ctx[2]);
    			if (img.src !== (img_src_value = /*userImage*/ ctx[3])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*userName*/ ctx[0]);
    			attr_dev(img, "class", "svelte-1q9dit7");
    			add_location(img, file, 69, 8, 1253);
    			attr_dev(div0, "class", "thumb svelte-1q9dit7");
    			toggle_class(div0, "thumb-placeholder", !/*userImage*/ ctx[3]);
    			add_location(div0, file, 68, 6, 1186);
    			attr_dev(h1, "class", "svelte-1q9dit7");
    			add_location(h1, file, 72, 8, 1343);
    			attr_dev(h2, "class", "svelte-1q9dit7");
    			add_location(h2, file, 73, 8, 1371);
    			attr_dev(div1, "class", "user-data svelte-1q9dit7");
    			add_location(div1, file, 71, 6, 1311);
    			attr_dev(header, "class", "svelte-1q9dit7");
    			add_location(header, file, 67, 4, 1171);
    			add_location(p, file, 77, 6, 1454);
    			attr_dev(div2, "class", "description svelte-1q9dit7");
    			add_location(div2, file, 76, 4, 1422);
    			attr_dev(div3, "class", "contact-card svelte-1q9dit7");
    			add_location(div3, file, 66, 2, 1140);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, header);
    			append_dev(header, div0);
    			append_dev(div0, img);
    			append_dev(header, t0);
    			append_dev(header, div1);
    			append_dev(div1, h1);
    			append_dev(h1, t1);
    			append_dev(div1, t2);
    			append_dev(div1, h2);
    			append_dev(h2, t3);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(p, t5);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*userImage*/ 8 && img.src !== (img_src_value = /*userImage*/ ctx[3])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*userName*/ 1) {
    				attr_dev(img, "alt", /*userName*/ ctx[0]);
    			}

    			if (dirty & /*userImage*/ 8) {
    				toggle_class(div0, "thumb-placeholder", !/*userImage*/ ctx[3]);
    			}

    			if (dirty & /*userName*/ 1) set_data_dev(t1, /*userName*/ ctx[0]);
    			if (dirty & /*jobTitle*/ 2) set_data_dev(t3, /*jobTitle*/ ctx[1]);
    			if (dirty & /*description*/ 4) set_data_dev(t5, /*description*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
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
    	let { userName } = $$props;
    	let { jobTitle } = $$props;
    	let { description } = $$props;
    	let { userImage } = $$props;
    	const writable_props = ["userName", "jobTitle", "description", "userImage"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ContactCard> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ContactCard", $$slots, []);

    	$$self.$set = $$props => {
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

    class ContactCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			userName: 0,
    			jobTitle: 1,
    			description: 2,
    			userImage: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ContactCard",
    			options,
    			id: create_fragment.name
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

    /* src/App.svelte generated by Svelte v3.24.0 */
    const file$1 = "src/App.svelte";

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

    // (101:6) {#each passwords as pw, i}
    function create_each_block_1(ctx) {
    	let li;
    	let t_value = /*pw*/ ctx[29] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[15](/*i*/ ctx[28], ...args);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file$1, 101, 8, 2176);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);

    			if (!mounted) {
    				dispose = listen_dev(li, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*passwords*/ 32 && t_value !== (t_value = /*pw*/ ctx[29] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(101:6) {#each passwords as pw, i}",
    		ctx
    	});

    	return block;
    }

    // (133:0) {:else}
    function create_else_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Please enter some data and hit the button!";
    			add_location(p, file$1, 133, 2, 3067);
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
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(133:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (131:0) {#if formState === 'invalid'}
    function create_if_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Invalid input.";
    			add_location(p, file$1, 131, 2, 3035);
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
    			p = element("p");
    			p.textContent = "Please start adding some contacts!!!";
    			add_location(p, file$1, 144, 2, 3349);
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
    			h2 = element("h2");
    			t0 = text("# ");
    			t1 = text(t1_value);
    			t2 = space();
    			create_component(contactcard.$$.fragment);
    			add_location(h2, file$1, 137, 2, 3177);
    			this.first = h2;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    			insert_dev(target, t2, anchor);
    			mount_component(contactcard, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*createdContacts*/ 16) && t1_value !== (t1_value = /*i*/ ctx[28] + 1 + "")) set_data_dev(t1, t1_value);
    			const contactcard_changes = {};
    			if (dirty & /*createdContacts*/ 16) contactcard_changes.userName = /*contact*/ ctx[26].name;
    			if (dirty & /*createdContacts*/ 16) contactcard_changes.jobTitle = /*contact*/ ctx[26].title;
    			if (dirty & /*createdContacts*/ 16) contactcard_changes.description = /*contact*/ ctx[26].description;
    			if (dirty & /*createdContacts*/ 16) contactcard_changes.userImage = /*contact*/ ctx[26].image;
    			contactcard.$set(contactcard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(contactcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(contactcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t2);
    			destroy_component(contactcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(137:0) {#each createdContacts as contact, i (contact.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
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
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*formState*/ ctx[8] === "invalid") return create_if_block;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);
    	let each_value = /*createdContacts*/ ctx[4];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*contact*/ ctx[26].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let each1_else = null;

    	if (!each_value.length) {
    		each1_else = create_else_block(ctx);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Password";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			p = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			button0 = element("button");
    			button0.textContent = "Add Password";
    			t6 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t7 = space();
    			div6 = element("div");
    			div2 = element("div");
    			label1 = element("label");
    			label1.textContent = "User Name";
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			div3 = element("div");
    			label2 = element("label");
    			label2.textContent = "Job Title";
    			t12 = space();
    			input2 = element("input");
    			t13 = space();
    			div4 = element("div");
    			label3 = element("label");
    			label3.textContent = "Image URL";
    			t15 = space();
    			input3 = element("input");
    			t16 = space();
    			div5 = element("div");
    			label4 = element("label");
    			label4.textContent = "Description";
    			t18 = space();
    			textarea = element("textarea");
    			t19 = space();
    			button1 = element("button");
    			button1.textContent = "Add Contact";
    			t21 = space();
    			button2 = element("button");
    			button2.textContent = "Delete First";
    			t23 = space();
    			button3 = element("button");
    			button3.textContent = "Delete Last";
    			t25 = space();
    			if_block.c();
    			t26 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();

    			if (each1_else) {
    				each1_else.c();
    			}

    			attr_dev(label0, "for", "password");
    			add_location(label0, file$1, 95, 4, 1890);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "currentPassword");
    			add_location(input0, file$1, 96, 4, 1933);
    			add_location(p, file$1, 97, 4, 2009);
    			add_location(button0, file$1, 98, 4, 2073);
    			add_location(ul, file$1, 99, 4, 2130);
    			attr_dev(div0, "class", "form-control");
    			add_location(div0, file$1, 94, 2, 1859);
    			attr_dev(div1, "id", "form1");
    			attr_dev(div1, "class", "svelte-gwk4ma");
    			add_location(div1, file$1, 93, 0, 1840);
    			attr_dev(label1, "for", "userName");
    			add_location(label1, file$1, 109, 4, 2315);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "id", "userName");
    			add_location(input1, file$1, 110, 4, 2359);
    			attr_dev(div2, "class", "form-control");
    			add_location(div2, file$1, 108, 2, 2284);
    			attr_dev(label2, "for", "jobTitle");
    			add_location(label2, file$1, 113, 4, 2455);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "id", "jobTitle");
    			add_location(input2, file$1, 114, 4, 2499);
    			attr_dev(div3, "class", "form-control");
    			add_location(div3, file$1, 112, 2, 2424);
    			attr_dev(label3, "for", "image");
    			add_location(label3, file$1, 117, 4, 2596);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "id", "image");
    			add_location(input3, file$1, 118, 4, 2637);
    			attr_dev(div4, "class", "form-control");
    			add_location(div4, file$1, 116, 2, 2565);
    			attr_dev(label4, "for", "desc");
    			add_location(label4, file$1, 121, 4, 2731);
    			attr_dev(textarea, "rows", textarea_rows_value = 3);
    			attr_dev(textarea, "id", "desc");
    			add_location(textarea, file$1, 122, 4, 2773);
    			attr_dev(div5, "class", "form-control");
    			add_location(div5, file$1, 120, 2, 2700);
    			attr_dev(div6, "id", "form");
    			attr_dev(div6, "class", "svelte-gwk4ma");
    			add_location(div6, file$1, 107, 0, 2266);
    			add_location(button1, file$1, 126, 0, 2847);
    			add_location(button2, file$1, 127, 0, 2898);
    			add_location(button3, file$1, 128, 0, 2951);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*currentPassword*/ ctx[6]);
    			append_dev(div0, t2);
    			append_dev(div0, p);
    			append_dev(p, t3);
    			append_dev(div0, t4);
    			append_dev(div0, button0);
    			append_dev(div0, t6);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul, null);
    			}

    			insert_dev(target, t7, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t9);
    			append_dev(div2, input1);
    			set_input_value(input1, /*name*/ ctx[0]);
    			append_dev(div6, t10);
    			append_dev(div6, div3);
    			append_dev(div3, label2);
    			append_dev(div3, t12);
    			append_dev(div3, input2);
    			set_input_value(input2, /*title*/ ctx[2]);
    			append_dev(div6, t13);
    			append_dev(div6, div4);
    			append_dev(div4, label3);
    			append_dev(div4, t15);
    			append_dev(div4, input3);
    			set_input_value(input3, /*image*/ ctx[3]);
    			append_dev(div6, t16);
    			append_dev(div6, div5);
    			append_dev(div5, label4);
    			append_dev(div5, t18);
    			append_dev(div5, textarea);
    			set_input_value(textarea, /*description*/ ctx[1]);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, button2, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, button3, anchor);
    			insert_dev(target, t25, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, t26, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each1_anchor, anchor);

    			if (each1_else) {
    				each1_else.m(target, anchor);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[14]),
    					listen_dev(button0, "click", /*addPassword*/ ctx[9], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[16]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[17]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[18]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[19]),
    					listen_dev(button1, "click", /*addContact*/ ctx[11], false, false, false),
    					listen_dev(button2, "click", /*deleteFirst*/ ctx[12], false, false, false),
    					listen_dev(button3, "click", /*deleteLast*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentPassword*/ 64 && input0.value !== /*currentPassword*/ ctx[6]) {
    				set_input_value(input0, /*currentPassword*/ ctx[6]);
    			}

    			if ((!current || dirty & /*passwordValidation*/ 128) && t3_value !== (t3_value = (/*passwordValidation*/ ctx[7].length && /*passwordValidation*/ ctx[7][0]) + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*deletePassword, passwords*/ 1056) {
    				each_value_1 = /*passwords*/ ctx[5];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
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
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each1_lookup, each1_anchor.parentNode, outro_and_destroy_block, create_each_block, each1_anchor, get_each_context);
    				check_outros();

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
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div6);
    			if (detaching) detach_dev(t19);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t21);
    			if (detaching) detach_dev(button2);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(button3);
    			if (detaching) detach_dev(t25);
    			if_block.d(detaching);
    			if (detaching) detach_dev(t26);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each1_anchor);
    			if (each1_else) each1_else.d(detaching);
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
    	validate_slots("App", $$slots, []);

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

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map