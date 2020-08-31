
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
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
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
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

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function cubicIn(t) {
        return t * t * t;
    }
    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function tick_spring(ctx, last_value, current_value, target_value) {
        if (typeof current_value === 'number' || is_date(current_value)) {
            // @ts-ignore
            const delta = target_value - current_value;
            // @ts-ignore
            const velocity = (current_value - last_value) / (ctx.dt || 1 / 60); // guard div by 0
            const spring = ctx.opts.stiffness * delta;
            const damper = ctx.opts.damping * velocity;
            const acceleration = (spring - damper) * ctx.inv_mass;
            const d = (velocity + acceleration) * ctx.dt;
            if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
                return target_value; // settled
            }
            else {
                ctx.settled = false; // signal loop to keep ticking
                // @ts-ignore
                return is_date(current_value) ?
                    new Date(current_value.getTime() + d) : current_value + d;
            }
        }
        else if (Array.isArray(current_value)) {
            // @ts-ignore
            return current_value.map((_, i) => tick_spring(ctx, last_value[i], current_value[i], target_value[i]));
        }
        else if (typeof current_value === 'object') {
            const next_value = {};
            for (const k in current_value)
                // @ts-ignore
                next_value[k] = tick_spring(ctx, last_value[k], current_value[k], target_value[k]);
            // @ts-ignore
            return next_value;
        }
        else {
            throw new Error(`Cannot spring ${typeof current_value} values`);
        }
    }
    function spring(value, opts = {}) {
        const store = writable(value);
        const { stiffness = 0.15, damping = 0.8, precision = 0.01 } = opts;
        let last_time;
        let task;
        let current_token;
        let last_value = value;
        let target_value = value;
        let inv_mass = 1;
        let inv_mass_recovery_rate = 0;
        let cancel_task = false;
        function set(new_value, opts = {}) {
            target_value = new_value;
            const token = current_token = {};
            if (value == null || opts.hard || (spring.stiffness >= 1 && spring.damping >= 1)) {
                cancel_task = true; // cancel any running animation
                last_time = now();
                last_value = new_value;
                store.set(value = target_value);
                return Promise.resolve();
            }
            else if (opts.soft) {
                const rate = opts.soft === true ? .5 : +opts.soft;
                inv_mass_recovery_rate = 1 / (rate * 60);
                inv_mass = 0; // infinite mass, unaffected by spring forces
            }
            if (!task) {
                last_time = now();
                cancel_task = false;
                task = loop(now => {
                    if (cancel_task) {
                        cancel_task = false;
                        task = null;
                        return false;
                    }
                    inv_mass = Math.min(inv_mass + inv_mass_recovery_rate, 1);
                    const ctx = {
                        inv_mass,
                        opts: spring,
                        settled: true,
                        dt: (now - last_time) * 60 / 1000
                    };
                    const next_value = tick_spring(ctx, last_value, value, target_value);
                    last_time = now;
                    last_value = value;
                    store.set(value = next_value);
                    if (ctx.settled)
                        task = null;
                    return !ctx.settled;
                });
            }
            return new Promise(fulfil => {
                task.promise.then(() => {
                    if (token === current_token)
                        fulfil();
                });
            });
        }
        const spring = {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe,
            stiffness,
            damping,
            precision
        };
        return spring;
    }

    function get_interpolator(a, b) {
        if (a === b || a !== a)
            return () => a;
        const type = typeof a;
        if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            throw new Error('Cannot interpolate values of different type');
        }
        if (Array.isArray(a)) {
            const arr = b.map((bi, i) => {
                return get_interpolator(a[i], bi);
            });
            return t => arr.map(fn => fn(t));
        }
        if (type === 'object') {
            if (!a || !b)
                throw new Error('Object cannot be null');
            if (is_date(a) && is_date(b)) {
                a = a.getTime();
                b = b.getTime();
                const delta = b - a;
                return t => new Date(a + t * delta);
            }
            const keys = Object.keys(b);
            const interpolators = {};
            keys.forEach(key => {
                interpolators[key] = get_interpolator(a[key], b[key]);
            });
            return t => {
                const result = {};
                keys.forEach(key => {
                    result[key] = interpolators[key](t);
                });
                return result;
            };
        }
        if (type === 'number') {
            const delta = b - a;
            return t => a + t * delta;
        }
        throw new Error(`Cannot interpolate ${type} values`);
    }
    function tweened(value, defaults = {}) {
        const store = writable(value);
        let task;
        let target_value = value;
        function set(new_value, opts) {
            if (value == null) {
                store.set(value = new_value);
                return Promise.resolve();
            }
            target_value = new_value;
            let previous_task = task;
            let started = false;
            let { delay = 0, duration = 400, easing = identity, interpolate = get_interpolator } = assign(assign({}, defaults), opts);
            if (duration === 0) {
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                store.set(value = target_value);
                return Promise.resolve();
            }
            const start = now() + delay;
            let fn;
            task = loop(now => {
                if (now < start)
                    return true;
                if (!started) {
                    fn = interpolate(value, new_value);
                    if (typeof duration === 'function')
                        duration = duration(value, new_value);
                    started = true;
                }
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                const elapsed = now - start;
                if (elapsed > duration) {
                    store.set(value = new_value);
                    return false;
                }
                // @ts-ignore
                store.set(value = fn(easing(elapsed / duration)));
                return true;
            });
            return task.promise;
        }
        return {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe
        };
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => `overflow: hidden;` +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /* src/Spring.svelte generated by Svelte v3.24.1 */
    const file = "src/Spring.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[7] = i;
    	return child_ctx;
    }

    // (81:4) {#each $cards as card, i (card.id)}
    function create_each_block(key_1, ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "card svelte-1a1ekzd");
    			set_style(div, "background", /*card*/ ctx[5].color);
    			set_style(div, "transform", "rotateZ(" + /*$cardPos*/ ctx[1][/*i*/ ctx[7]].rotation + "deg) translateX(" + /*$cardPos*/ ctx[1][/*i*/ ctx[7]].dx + "px)");
    			add_location(div, file, 81, 6, 1379);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = listen_dev(
    					div,
    					"click",
    					function () {
    						if (is_function(/*discard*/ ctx[4].bind(this, /*i*/ ctx[7]))) /*discard*/ ctx[4].bind(this, /*i*/ ctx[7]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*$cards*/ 1) {
    				set_style(div, "background", /*card*/ ctx[5].color);
    			}

    			if (dirty & /*$cardPos, $cards*/ 3) {
    				set_style(div, "transform", "rotateZ(" + /*$cardPos*/ ctx[1][/*i*/ ctx[7]].rotation + "deg) translateX(" + /*$cardPos*/ ctx[1][/*i*/ ctx[7]].dx + "px)");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(81:4) {#each $cards as card, i (card.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div1;
    	let div0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_value = /*$cards*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*card*/ ctx[5].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "cards");
    			add_location(div0, file, 79, 2, 1313);
    			attr_dev(div1, "class", "page svelte-1a1ekzd");
    			add_location(div1, file, 78, 0, 1292);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$cards, $cardPos, discard*/ 19) {
    				const each_value = /*$cards*/ ctx[0];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div0, destroy_block, create_each_block, null, get_each_context);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
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
    	let $cards;
    	let $cardPos;

    	let cards = writable([
    		{ id: "c1", color: "red" },
    		{ id: "c2", color: "blue" },
    		{ id: "c3", color: "green" },
    		{ id: "c4", color: "orange" }
    	]);

    	validate_store(cards, "cards");
    	component_subscribe($$self, cards, value => $$invalidate(0, $cards = value));

    	let cardPos = spring(
    		[
    			{ rotation: 10, dx: 0 },
    			{ rotation: -10, dx: 0 },
    			{ rotation: 19, dx: 0 },
    			{ rotation: -25, dx: 0 }
    		],
    		{
    			stiffness: 0.05,
    			damping: 0.9,
    			precision: 0.001
    		}
    	);

    	validate_store(cardPos, "cardPos");
    	component_subscribe($$self, cardPos, value => $$invalidate(1, $cardPos = value));

    	function discard(index) {
    		cardPos.update(items => {
    			const updatedCardPositions = [...items];
    			const updatedCardPos = { ...updatedCardPositions[index] };
    			updatedCardPos.dx = 1200;
    			updatedCardPos.rotation = 60;
    			updatedCardPositions[index] = updatedCardPos;
    			return updatedCardPositions;
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Spring> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Spring", $$slots, []);

    	$$self.$capture_state = () => ({
    		writable,
    		spring,
    		cards,
    		cardPos,
    		discard,
    		$cards,
    		$cardPos
    	});

    	$$self.$inject_state = $$props => {
    		if ("cards" in $$props) $$invalidate(2, cards = $$props.cards);
    		if ("cardPos" in $$props) $$invalidate(3, cardPos = $$props.cardPos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [$cards, $cardPos, cards, cardPos, discard];
    }

    class Spring extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Spring",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    function noop$1() { }
    const identity$1 = x => x;
    function assign$1(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function is_empty$1(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store$1(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe$1(store, ...callbacks) {
        if (store == null) {
            return noop$1;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe$1(component, store, callback) {
        component.$$.on_destroy.push(subscribe$1(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign$1($$scope.ctx.slice(), definition[1](fn(ctx)))
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

    const is_client$1 = typeof window !== 'undefined';
    let now$1 = is_client$1
        ? () => window.performance.now()
        : () => Date.now();
    let raf$1 = is_client$1 ? cb => requestAnimationFrame(cb) : noop$1;

    const tasks$1 = new Set();
    function run_tasks$1(now) {
        tasks$1.forEach(task => {
            if (!task.c(now)) {
                tasks$1.delete(task);
                task.f();
            }
        });
        if (tasks$1.size !== 0)
            raf$1(run_tasks$1);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop$1(callback) {
        let task;
        if (tasks$1.size === 0)
            raf$1(run_tasks$1);
        return {
            promise: new Promise(fulfill => {
                tasks$1.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks$1.delete(task);
            }
        };
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function empty$1() {
        return text$1('');
    }
    function listen$1(node, event, handler, options) {
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
    function attr$1(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children$1(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event$1(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs$1 = new Set();
    let active$1 = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash$1(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule$1(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash$1(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs$1.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element$1('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active$1 += 1;
        return name;
    }
    function delete_rule$1(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active$1 -= deleted;
            if (!active$1)
                clear_rules$1();
        }
    }
    function clear_rules$1() {
        raf$1(() => {
            if (active$1)
                return;
            active_docs$1.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs$1.clear();
        });
    }

    let current_component$1;
    function set_current_component$1(component) {
        current_component$1 = component;
    }
    function get_current_component() {
        if (!current_component$1)
            throw new Error(`Function called outside component initialization`);
        return current_component$1;
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
                const event = custom_event$1(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
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

    let promise$1;
    function wait$1() {
        if (!promise$1) {
            promise$1 = Promise.resolve();
            promise$1.then(() => {
                promise$1 = null;
            });
        }
        return promise$1;
    }
    function dispatch$1(node, direction, kind) {
        node.dispatchEvent(custom_event$1(`${direction ? 'intro' : 'outro'}${kind}`));
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
    const null_transition$1 = { duration: 0 };
    function create_bidirectional_transition$1(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule$1(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity$1, tick = noop$1, css } = config || null_transition$1;
            const program = {
                start: now$1() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros$1;
                outros$1.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule$1(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback$1(() => dispatch$1(node, b, 'start'));
                loop$1(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch$1(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule$1(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch$1(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all$1(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function$1(config)) {
                    wait$1().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function create_component(block) {
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
        $set($$props) {
            if (this.$$set && !is_empty$1($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev$1(type, detail) {
        document.dispatchEvent(custom_event$1(type, Object.assign({ version: '3.24.1' }, detail)));
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev$1("SvelteDOMSetProperty", { node, property, value });
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

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/Button.svelte generated by Svelte v3.24.1 */

    const file$1 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/Button.svelte";

    // (91:0) {:else}
    function create_else_block(ctx) {
    	let button;
    	let button_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			button = element$1("button");
    			if (default_slot) default_slot.c();
    			attr_dev$1(button, "class", button_class_value = "" + (/*mode*/ ctx[2] + " " + /*color*/ ctx[3] + " svelte-g32zaw"));
    			attr_dev$1(button, "type", /*type*/ ctx[0]);
    			button.disabled = /*disabled*/ ctx[4];
    			add_location$1(button, file$1, 91, 2, 1517);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev$1(button, "click", /*click_handler*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 32) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*mode, color*/ 12 && button_class_value !== (button_class_value = "" + (/*mode*/ ctx[2] + " " + /*color*/ ctx[3] + " svelte-g32zaw"))) {
    				attr_dev$1(button, "class", button_class_value);
    			}

    			if (!current || dirty & /*type*/ 1) {
    				attr_dev$1(button, "type", /*type*/ ctx[0]);
    			}

    			if (!current || dirty & /*disabled*/ 16) {
    				prop_dev(button, "disabled", /*disabled*/ ctx[4]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(button);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(91:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (87:0) {#if href}
    function create_if_block(ctx) {
    	let a;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			a = element$1("a");
    			if (default_slot) default_slot.c();
    			attr_dev$1(a, "href", /*href*/ ctx[1]);
    			attr_dev$1(a, "class", "svelte-g32zaw");
    			add_location$1(a, file$1, 87, 2, 1476);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 32) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*href*/ 2) {
    				attr_dev$1(a, "href", /*href*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(a);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(87:0) {#if href}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*href*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty$1();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev$1(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros$1();

    				transition_out$1(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros$1();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in$1(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev$1(if_block_anchor);
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
    	let { type = "button" } = $$props;
    	let { href = null } = $$props;
    	let { mode = null } = $$props;
    	let { color = null } = $$props;
    	let { disabled = false } = $$props;
    	const writable_props = ["type", "href", "mode", "color", "disabled"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("Button", $$slots, ['default']);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    		if ("href" in $$props) $$invalidate(1, href = $$props.href);
    		if ("mode" in $$props) $$invalidate(2, mode = $$props.mode);
    		if ("color" in $$props) $$invalidate(3, color = $$props.color);
    		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ type, href, mode, color, disabled });

    	$$self.$inject_state = $$props => {
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    		if ("href" in $$props) $$invalidate(1, href = $$props.href);
    		if ("mode" in $$props) $$invalidate(2, mode = $$props.mode);
    		if ("color" in $$props) $$invalidate(3, color = $$props.color);
    		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [type, href, mode, color, disabled, $$scope, $$slots, click_handler];
    }

    class Button extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);

    		init$1(this, options, instance$1, create_fragment$1, safe_not_equal$1, {
    			type: 0,
    			href: 1,
    			mode: 2,
    			color: 3,
    			disabled: 4
    		});

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get type() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
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

    	get color() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue$1 = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable$1(value, start = noop$1) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal$1(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue$1.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue$1.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue$1.length; i += 2) {
                            subscriber_queue$1[i][0](subscriber_queue$1[i + 1]);
                        }
                        subscriber_queue$1.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop$1) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop$1;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const meetups = writable$1([
      {
        id: "m1",
        title: "Coding Bootcamp",
        subtitle: "Learn to code in 2 hours",
        description:
          "In this meetup, we will have some experts that teach you how to code!",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Caffe_Nero_coffee_bar%2C_High_St%2C_Sutton%2C_Surrey%2C_Greater_London.JPG/800px-Caffe_Nero_coffee_bar%2C_High_St%2C_Sutton%2C_Surrey%2C_Greater_London.JPG",
        address: "27th Nerd Road, 32523 New York",
        contactEmail: "code@test.com",
        isFavorite: false,
      },
      {
        id: "m2",
        title: "Swim Together",
        subtitle: "Let's go for some swimming",
        description: "We will simply swim some rounds!",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Olympic_swimming_pool_%28Tbilisi%29.jpg/800px-Olympic_swimming_pool_%28Tbilisi%29.jpg",
        address: "27th Nerd Road, 32523 New York",
        contactEmail: "swim@test.com",
        isFavorite: false,
      },
    ]);

    const meetupsStore = {
      subscribe: meetups.subscribe,
      addMeetup: (meetupData) => {
        const newMeetup = {
          ...meetupData,
          id: Math.random().toString(),
          isFavorite: false,
        };
        meetups.update((items) => {
          return [newMeetup, ...items];
        });
      },
      toggleFavorite: (id) => {
        meetups.update((items) => {
          const updatedMeetup = { ...items.find((m) => m.id === id) };
          updatedMeetup.isFavorite = !updatedMeetup.isFavorite;
          const meetupIndex = items.findIndex((m) => m.id === id);
          const updatedMeetups = [...items];
          updatedMeetups[meetupIndex] = updatedMeetup;
          return updatedMeetups;
        });
      },
      updateMeetup: (id, meetupData) => {
        meetups.update((items) => {
          const meetupIndex = items.findIndex((i) => i.id === id);
          const updatedMeetup = { ...items[meetupIndex], ...meetupData };
          const updatedMeetups = [...items];
          updatedMeetups[meetupIndex] = updatedMeetup;
          return updatedMeetups;
        });
      },
      removeMeetup: (id) => {
        meetups.update((items) => {
          return items.filter((i) => i.id !== id);
        });
      },
    };

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/Meetups/MeetupDetails.svelte generated by Svelte v3.24.1 */
    const file$2 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/Meetups/MeetupDetails.svelte";

    // (69:4) <Button href="mailto:{selectedMeetup.contactEmail}">
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text$1("Contact");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(t);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(69:4) <Button href=\\\"mailto:{selectedMeetup.contactEmail}\\\">",
    		ctx
    	});

    	return block;
    }

    // (70:4) <Button       type="button"       mode="outline"       on:click={() => dispatch('closeDetails')}>
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text$1("Close");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(t);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(70:4) <Button       type=\\\"button\\\"       mode=\\\"outline\\\"       on:click={() => dispatch('closeDetails')}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let section;
    	let div0;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let div1;
    	let h1;
    	let t1_value = /*selectedMeetup*/ ctx[0].title + "";
    	let t1;
    	let t2;
    	let h2;
    	let t3_value = /*selectedMeetup*/ ctx[0].subtitle + "";
    	let t3;
    	let t4;
    	let t5_value = /*selectedMeetup*/ ctx[0].address + "";
    	let t5;
    	let t6;
    	let p;
    	let t7_value = /*selectedMeetup*/ ctx[0].description + "";
    	let t7;
    	let t8;
    	let button0;
    	let t9;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				href: "mailto:" + /*selectedMeetup*/ ctx[0].contactEmail,
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1 = new Button({
    			props: {
    				type: "button",
    				mode: "outline",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*click_handler*/ ctx[3]);

    	const block = {
    		c: function create() {
    			section = element$1("section");
    			div0 = element$1("div");
    			img = element$1("img");
    			t0 = space$1();
    			div1 = element$1("div");
    			h1 = element$1("h1");
    			t1 = text$1(t1_value);
    			t2 = space$1();
    			h2 = element$1("h2");
    			t3 = text$1(t3_value);
    			t4 = text$1(" - ");
    			t5 = text$1(t5_value);
    			t6 = space$1();
    			p = element$1("p");
    			t7 = text$1(t7_value);
    			t8 = space$1();
    			create_component(button0.$$.fragment);
    			t9 = space$1();
    			create_component(button1.$$.fragment);
    			if (img.src !== (img_src_value = /*selectedMeetup*/ ctx[0].imageUrl)) attr_dev$1(img, "src", img_src_value);
    			attr_dev$1(img, "alt", img_alt_value = /*selectedMeetup*/ ctx[0].title);
    			attr_dev$1(img, "class", "svelte-10utsu1");
    			add_location$1(img, file$2, 62, 4, 921);
    			attr_dev$1(div0, "class", "image svelte-10utsu1");
    			add_location$1(div0, file$2, 61, 2, 897);
    			attr_dev$1(h1, "class", "svelte-10utsu1");
    			add_location$1(h1, file$2, 65, 4, 1023);
    			attr_dev$1(h2, "class", "svelte-10utsu1");
    			add_location$1(h2, file$2, 66, 4, 1059);
    			attr_dev$1(p, "class", "svelte-10utsu1");
    			add_location$1(p, file$2, 67, 4, 1125);
    			attr_dev$1(div1, "class", "content svelte-10utsu1");
    			add_location$1(div1, file$2, 64, 2, 997);
    			attr_dev$1(section, "class", "svelte-10utsu1");
    			add_location$1(section, file$2, 60, 0, 885);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, section, anchor);
    			append_dev$1(section, div0);
    			append_dev$1(div0, img);
    			append_dev$1(section, t0);
    			append_dev$1(section, div1);
    			append_dev$1(div1, h1);
    			append_dev$1(h1, t1);
    			append_dev$1(div1, t2);
    			append_dev$1(div1, h2);
    			append_dev$1(h2, t3);
    			append_dev$1(h2, t4);
    			append_dev$1(h2, t5);
    			append_dev$1(div1, t6);
    			append_dev$1(div1, p);
    			append_dev$1(p, t7);
    			append_dev$1(div1, t8);
    			mount_component$1(button0, div1, null);
    			append_dev$1(div1, t9);
    			mount_component$1(button1, div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*selectedMeetup*/ 1 && img.src !== (img_src_value = /*selectedMeetup*/ ctx[0].imageUrl)) {
    				attr_dev$1(img, "src", img_src_value);
    			}

    			if (!current || dirty & /*selectedMeetup*/ 1 && img_alt_value !== (img_alt_value = /*selectedMeetup*/ ctx[0].title)) {
    				attr_dev$1(img, "alt", img_alt_value);
    			}

    			if ((!current || dirty & /*selectedMeetup*/ 1) && t1_value !== (t1_value = /*selectedMeetup*/ ctx[0].title + "")) set_data_dev$1(t1, t1_value);
    			if ((!current || dirty & /*selectedMeetup*/ 1) && t3_value !== (t3_value = /*selectedMeetup*/ ctx[0].subtitle + "")) set_data_dev$1(t3, t3_value);
    			if ((!current || dirty & /*selectedMeetup*/ 1) && t5_value !== (t5_value = /*selectedMeetup*/ ctx[0].address + "")) set_data_dev$1(t5, t5_value);
    			if ((!current || dirty & /*selectedMeetup*/ 1) && t7_value !== (t7_value = /*selectedMeetup*/ ctx[0].description + "")) set_data_dev$1(t7, t7_value);
    			const button0_changes = {};
    			if (dirty & /*selectedMeetup*/ 1) button0_changes.href = "mailto:" + /*selectedMeetup*/ ctx[0].contactEmail;

    			if (dirty & /*$$scope*/ 32) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(button0.$$.fragment, local);
    			transition_in$1(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(button0.$$.fragment, local);
    			transition_out$1(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(section);
    			destroy_component$1(button0);
    			destroy_component$1(button1);
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
    	let { id } = $$props;
    	let selectedMeetup;

    	const unsubscribe = meetupsStore.subscribe(items => {
    		$$invalidate(0, selectedMeetup = items.find(i => i.id === id));
    	});

    	onDestroy(() => unsubscribe());
    	const dispatch = createEventDispatcher();
    	const writable_props = ["id"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MeetupDetails> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("MeetupDetails", $$slots, []);
    	const click_handler = () => dispatch("closeDetails");

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({
    		Button,
    		meetups: meetupsStore,
    		onDestroy,
    		createEventDispatcher,
    		id,
    		selectedMeetup,
    		unsubscribe,
    		dispatch
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    		if ("selectedMeetup" in $$props) $$invalidate(0, selectedMeetup = $$props.selectedMeetup);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [selectedMeetup, dispatch, id, click_handler];
    }

    class MeetupDetails extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$2, create_fragment$2, safe_not_equal$1, { id: 2 });

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MeetupDetails",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[2] === undefined && !("id" in props)) {
    			console.warn("<MeetupDetails> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<MeetupDetails>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<MeetupDetails>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/TextInput.svelte generated by Svelte v3.24.1 */

    const file$3 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/TextInput.svelte";

    // (67:2) {:else}
    function create_else_block$1(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element$1("input");
    			attr_dev$1(input, "type", /*type*/ ctx[6]);
    			attr_dev$1(input, "id", /*id*/ ctx[3]);
    			input.value = /*value*/ ctx[1];
    			attr_dev$1(input, "class", "svelte-1mrfx4j");
    			toggle_class(input, "invalid", !/*valid*/ ctx[7] && /*touched*/ ctx[0]);
    			add_location$1(input, file$3, 67, 4, 1172);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, input, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev$1(input, "input", /*input_handler_1*/ ctx[10], false, false, false),
    					listen_dev$1(input, "blur", /*blur_handler_1*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*type*/ 64) {
    				attr_dev$1(input, "type", /*type*/ ctx[6]);
    			}

    			if (dirty & /*id*/ 8) {
    				attr_dev$1(input, "id", /*id*/ ctx[3]);
    			}

    			if (dirty & /*value*/ 2 && input.value !== /*value*/ ctx[1]) {
    				prop_dev(input, "value", /*value*/ ctx[1]);
    			}

    			if (dirty & /*valid, touched*/ 129) {
    				toggle_class(input, "invalid", !/*valid*/ ctx[7] && /*touched*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(input);
    			mounted = false;
    			run_all$1(dispose);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(67:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (59:2) {#if controlType === 'textarea'}
    function create_if_block_1(ctx) {
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element$1("textarea");
    			attr_dev$1(textarea, "rows", /*rows*/ ctx[5]);
    			attr_dev$1(textarea, "id", /*id*/ ctx[3]);
    			textarea.value = /*value*/ ctx[1];
    			attr_dev$1(textarea, "class", "svelte-1mrfx4j");
    			toggle_class(textarea, "invalid", !/*valid*/ ctx[7] && /*touched*/ ctx[0]);
    			add_location$1(textarea, file$3, 59, 4, 1013);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, textarea, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev$1(textarea, "input", /*input_handler*/ ctx[9], false, false, false),
    					listen_dev$1(textarea, "blur", /*blur_handler*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*rows*/ 32) {
    				attr_dev$1(textarea, "rows", /*rows*/ ctx[5]);
    			}

    			if (dirty & /*id*/ 8) {
    				attr_dev$1(textarea, "id", /*id*/ ctx[3]);
    			}

    			if (dirty & /*value*/ 2) {
    				prop_dev(textarea, "value", /*value*/ ctx[1]);
    			}

    			if (dirty & /*valid, touched*/ 129) {
    				toggle_class(textarea, "invalid", !/*valid*/ ctx[7] && /*touched*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(textarea);
    			mounted = false;
    			run_all$1(dispose);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(59:2) {#if controlType === 'textarea'}",
    		ctx
    	});

    	return block;
    }

    // (76:2) {#if validityMessage && !valid && touched}
    function create_if_block$1(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element$1("p");
    			t = text$1(/*validityMessage*/ ctx[8]);
    			attr_dev$1(p, "class", "error-message svelte-1mrfx4j");
    			add_location$1(p, file$3, 76, 4, 1371);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, p, anchor);
    			append_dev$1(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*validityMessage*/ 256) set_data_dev$1(t, /*validityMessage*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(p);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(76:2) {#if validityMessage && !valid && touched}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let label_1;
    	let t0;
    	let t1;
    	let t2;

    	function select_block_type(ctx, dirty) {
    		if (/*controlType*/ ctx[2] === "textarea") return create_if_block_1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*validityMessage*/ ctx[8] && !/*valid*/ ctx[7] && /*touched*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			label_1 = element$1("label");
    			t0 = text$1(/*label*/ ctx[4]);
    			t1 = space$1();
    			if_block0.c();
    			t2 = space$1();
    			if (if_block1) if_block1.c();
    			attr_dev$1(label_1, "for", /*id*/ ctx[3]);
    			attr_dev$1(label_1, "class", "svelte-1mrfx4j");
    			add_location$1(label_1, file$3, 57, 2, 942);
    			attr_dev$1(div, "class", "form-control svelte-1mrfx4j");
    			add_location$1(div, file$3, 56, 0, 913);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, div, anchor);
    			append_dev$1(div, label_1);
    			append_dev$1(label_1, t0);
    			append_dev$1(div, t1);
    			if_block0.m(div, null);
    			append_dev$1(div, t2);
    			if (if_block1) if_block1.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*label*/ 16) set_data_dev$1(t0, /*label*/ ctx[4]);

    			if (dirty & /*id*/ 8) {
    				attr_dev$1(label_1, "for", /*id*/ ctx[3]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div, t2);
    				}
    			}

    			if (/*validityMessage*/ ctx[8] && !/*valid*/ ctx[7] && /*touched*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(div);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { value } = $$props;
    	let { controlType = null } = $$props;
    	let { id } = $$props;
    	let { label } = $$props;
    	let { rows = null } = $$props;
    	let { type = "text" } = $$props;
    	let { valid = true } = $$props;
    	let { validityMessage } = $$props;
    	let { touched = false } = $$props;

    	const writable_props = [
    		"value",
    		"controlType",
    		"id",
    		"label",
    		"rows",
    		"type",
    		"valid",
    		"validityMessage",
    		"touched"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TextInput> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("TextInput", $$slots, []);

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	function input_handler_1(event) {
    		bubble($$self, event);
    	}

    	const blur_handler = () => $$invalidate(0, touched = true);
    	const blur_handler_1 = () => $$invalidate(0, touched = true);

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("controlType" in $$props) $$invalidate(2, controlType = $$props.controlType);
    		if ("id" in $$props) $$invalidate(3, id = $$props.id);
    		if ("label" in $$props) $$invalidate(4, label = $$props.label);
    		if ("rows" in $$props) $$invalidate(5, rows = $$props.rows);
    		if ("type" in $$props) $$invalidate(6, type = $$props.type);
    		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
    		if ("validityMessage" in $$props) $$invalidate(8, validityMessage = $$props.validityMessage);
    		if ("touched" in $$props) $$invalidate(0, touched = $$props.touched);
    	};

    	$$self.$capture_state = () => ({
    		value,
    		controlType,
    		id,
    		label,
    		rows,
    		type,
    		valid,
    		validityMessage,
    		touched
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("controlType" in $$props) $$invalidate(2, controlType = $$props.controlType);
    		if ("id" in $$props) $$invalidate(3, id = $$props.id);
    		if ("label" in $$props) $$invalidate(4, label = $$props.label);
    		if ("rows" in $$props) $$invalidate(5, rows = $$props.rows);
    		if ("type" in $$props) $$invalidate(6, type = $$props.type);
    		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
    		if ("validityMessage" in $$props) $$invalidate(8, validityMessage = $$props.validityMessage);
    		if ("touched" in $$props) $$invalidate(0, touched = $$props.touched);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		touched,
    		value,
    		controlType,
    		id,
    		label,
    		rows,
    		type,
    		valid,
    		validityMessage,
    		input_handler,
    		input_handler_1,
    		blur_handler,
    		blur_handler_1
    	];
    }

    class TextInput extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);

    		init$1(this, options, instance$3, create_fragment$3, safe_not_equal$1, {
    			value: 1,
    			controlType: 2,
    			id: 3,
    			label: 4,
    			rows: 5,
    			type: 6,
    			valid: 7,
    			validityMessage: 8,
    			touched: 0
    		});

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextInput",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<TextInput> was created without expected prop 'value'");
    		}

    		if (/*id*/ ctx[3] === undefined && !("id" in props)) {
    			console.warn("<TextInput> was created without expected prop 'id'");
    		}

    		if (/*label*/ ctx[4] === undefined && !("label" in props)) {
    			console.warn("<TextInput> was created without expected prop 'label'");
    		}

    		if (/*validityMessage*/ ctx[8] === undefined && !("validityMessage" in props)) {
    			console.warn("<TextInput> was created without expected prop 'validityMessage'");
    		}
    	}

    	get value() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get controlType() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set controlType(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rows() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rows(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valid() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valid(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get validityMessage() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set validityMessage(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get touched() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set touched(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut$1(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade$1(node, { delay = 0, duration = 400, easing = identity$1 }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly$1(node, { delay = 0, duration = 400, easing = cubicOut$1, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/Modal.svelte generated by Svelte v3.24.1 */
    const file$4 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/Modal.svelte";
    const get_footer_slot_changes = dirty => ({});
    const get_footer_slot_context = ctx => ({});

    // (69:6) <Button on:click={closeModal}>
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text$1("Close");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(t);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(69:6) <Button on:click={closeModal}>",
    		ctx
    	});

    	return block;
    }

    // (68:24)        
    function fallback_block(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*closeModal*/ ctx[1]);

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component$1(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component$1(button, detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(68:24)        ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div0;
    	let div0_transition;
    	let t0;
    	let div2;
    	let h1;
    	let t1;
    	let t2;
    	let div1;
    	let t3;
    	let footer;
    	let div2_transition;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
    	const footer_slot_template = /*$$slots*/ ctx[2].footer;
    	const footer_slot = create_slot(footer_slot_template, ctx, /*$$scope*/ ctx[3], get_footer_slot_context);
    	const footer_slot_or_fallback = footer_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			div0 = element$1("div");
    			t0 = space$1();
    			div2 = element$1("div");
    			h1 = element$1("h1");
    			t1 = text$1(/*title*/ ctx[0]);
    			t2 = space$1();
    			div1 = element$1("div");
    			if (default_slot) default_slot.c();
    			t3 = space$1();
    			footer = element$1("footer");
    			if (footer_slot_or_fallback) footer_slot_or_fallback.c();
    			attr_dev$1(div0, "class", "modal-backdrop svelte-1wfedfe");
    			add_location$1(div0, file$4, 60, 0, 998);
    			attr_dev$1(h1, "class", "svelte-1wfedfe");
    			add_location$1(h1, file$4, 62, 2, 1117);
    			attr_dev$1(div1, "class", "content svelte-1wfedfe");
    			add_location$1(div1, file$4, 63, 2, 1136);
    			attr_dev$1(footer, "class", "svelte-1wfedfe");
    			add_location$1(footer, file$4, 66, 2, 1182);
    			attr_dev$1(div2, "class", "modal svelte-1wfedfe");
    			add_location$1(div2, file$4, 61, 0, 1067);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, div0, anchor);
    			insert_dev$1(target, t0, anchor);
    			insert_dev$1(target, div2, anchor);
    			append_dev$1(div2, h1);
    			append_dev$1(h1, t1);
    			append_dev$1(div2, t2);
    			append_dev$1(div2, div1);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			append_dev$1(div2, t3);
    			append_dev$1(div2, footer);

    			if (footer_slot_or_fallback) {
    				footer_slot_or_fallback.m(footer, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev$1(div0, "click", /*closeModal*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 1) set_data_dev$1(t1, /*title*/ ctx[0]);

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}

    			if (footer_slot) {
    				if (footer_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(footer_slot, footer_slot_template, ctx, /*$$scope*/ ctx[3], dirty, get_footer_slot_changes, get_footer_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback$1(() => {
    				if (!div0_transition) div0_transition = create_bidirectional_transition$1(div0, fade$1, {}, true);
    				div0_transition.run(1);
    			});

    			transition_in$1(default_slot, local);
    			transition_in$1(footer_slot_or_fallback, local);

    			add_render_callback$1(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition$1(div2, fly$1, { y: 300 }, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div0_transition) div0_transition = create_bidirectional_transition$1(div0, fade$1, {}, false);
    			div0_transition.run(0);
    			transition_out$1(default_slot, local);
    			transition_out$1(footer_slot_or_fallback, local);
    			if (!div2_transition) div2_transition = create_bidirectional_transition$1(div2, fly$1, { y: 300 }, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(div0);
    			if (detaching && div0_transition) div0_transition.end();
    			if (detaching) detach_dev$1(t0);
    			if (detaching) detach_dev$1(div2);
    			if (default_slot) default_slot.d(detaching);
    			if (footer_slot_or_fallback) footer_slot_or_fallback.d(detaching);
    			if (detaching && div2_transition) div2_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { title } = $$props;
    	const dispatch = createEventDispatcher();

    	function closeModal() {
    		dispatch("cancel");
    	}

    	const writable_props = ["title"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("Modal", $$slots, ['default','footer']);

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		fly: fly$1,
    		fade: fade$1,
    		Button,
    		createEventDispatcher,
    		title,
    		dispatch,
    		closeModal
    	});

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, closeModal, $$slots, $$scope];
    }

    class Modal extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$4, create_fragment$4, safe_not_equal$1, { title: 0 });

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*title*/ ctx[0] === undefined && !("title" in props)) {
    			console.warn("<Modal> was created without expected prop 'title'");
    		}
    	}

    	get title() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function isEmpty(val) {
      return val.trim().length === 0;
    }

    function isValidEmail(email) {
      return new RegExp(
        "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
      ).test(email);
    }

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/Meetups/EditMeetup.svelte generated by Svelte v3.24.1 */
    const file$5 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/Meetups/EditMeetup.svelte";

    // (128:4) <Button type="button" mode="outline" on:click={cancel}>
    function create_default_slot_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text$1("Cancel");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(t);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(128:4) <Button type=\\\"button\\\" mode=\\\"outline\\\" on:click={cancel}>",
    		ctx
    	});

    	return block;
    }

    // (129:4) <Button type="button" on:click={submitForm} disabled={!formIsValid}>
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text$1("Save");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(t);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(129:4) <Button type=\\\"button\\\" on:click={submitForm} disabled={!formIsValid}>",
    		ctx
    	});

    	return block;
    }

    // (132:4) {#if id}
    function create_if_block$2(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				type: "button",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*deleteMeetup*/ ctx[14]);

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component$1(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 33554432) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component$1(button, detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(132:4) {#if id}",
    		ctx
    	});

    	return block;
    }

    // (133:6) <Button type="button" on:click={deleteMeetup}>
    function create_default_slot_1$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text$1("Delete");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(t);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(133:6) <Button type=\\\"button\\\" on:click={deleteMeetup}>",
    		ctx
    	});

    	return block;
    }

    // (127:2) <div slot="footer">
    function create_footer_slot(ctx) {
    	let div;
    	let button0;
    	let t0;
    	let button1;
    	let t1;
    	let current;

    	button0 = new Button({
    			props: {
    				type: "button",
    				mode: "outline",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*cancel*/ ctx[13]);

    	button1 = new Button({
    			props: {
    				type: "button",
    				disabled: !/*formIsValid*/ ctx[11],
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*submitForm*/ ctx[12]);
    	let if_block = /*id*/ ctx[0] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			create_component(button0.$$.fragment);
    			t0 = space$1();
    			create_component(button1.$$.fragment);
    			t1 = space$1();
    			if (if_block) if_block.c();
    			attr_dev$1(div, "slot", "footer");
    			add_location$1(div, file$5, 126, 2, 3180);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, div, anchor);
    			mount_component$1(button0, div, null);
    			append_dev$1(div, t0);
    			mount_component$1(button1, div, null);
    			append_dev$1(div, t1);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 33554432) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};
    			if (dirty & /*formIsValid*/ 2048) button1_changes.disabled = !/*formIsValid*/ ctx[11];

    			if (dirty & /*$$scope*/ 33554432) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);

    			if (/*id*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*id*/ 1) {
    						transition_in$1(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in$1(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros$1();

    				transition_out$1(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros$1();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(button0.$$.fragment, local);
    			transition_in$1(button1.$$.fragment, local);
    			transition_in$1(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(button0.$$.fragment, local);
    			transition_out$1(button1.$$.fragment, local);
    			transition_out$1(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(div);
    			destroy_component$1(button0);
    			destroy_component$1(button1);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_footer_slot.name,
    		type: "slot",
    		source: "(127:2) <div slot=\\\"footer\\\">",
    		ctx
    	});

    	return block;
    }

    // (82:0) <Modal title="Edit Meetup" on:cancel>
    function create_default_slot$2(ctx) {
    	let form;
    	let textinput0;
    	let t0;
    	let textinput1;
    	let t1;
    	let textinput2;
    	let t2;
    	let textinput3;
    	let t3;
    	let textinput4;
    	let t4;
    	let current;
    	let mounted;
    	let dispose;

    	textinput0 = new TextInput({
    			props: {
    				controlType: "input",
    				label: "Title",
    				id: "title",
    				valid: /*titleValid*/ ctx[6],
    				validityMessage: "Please enter a valid title",
    				value: /*title*/ ctx[1]
    			},
    			$$inline: true
    		});

    	textinput0.$on("input", /*input_handler*/ ctx[15]);

    	textinput1 = new TextInput({
    			props: {
    				controlType: "input",
    				label: "Subtitle",
    				id: "subtitle",
    				valid: /*subtitleValid*/ ctx[7],
    				validityMessage: "Please enter a valid subtitle",
    				value: /*subtitle*/ ctx[2]
    			},
    			$$inline: true
    		});

    	textinput1.$on("input", /*input_handler_1*/ ctx[16]);

    	textinput2 = new TextInput({
    			props: {
    				controlType: "input",
    				label: "Image URL",
    				id: "imageUrl",
    				valid: /*imageUrlValid*/ ctx[9],
    				validityMessage: "Please enter a valid image url.",
    				value: /*imageUrl*/ ctx[4]
    			},
    			$$inline: true
    		});

    	textinput2.$on("input", /*input_handler_2*/ ctx[17]);

    	textinput3 = new TextInput({
    			props: {
    				type: "email",
    				controlType: "input",
    				label: "Email",
    				id: "email",
    				valid: /*emailValid*/ ctx[10],
    				validityMessage: "Please enter a valid email.",
    				value: /*email*/ ctx[5]
    			},
    			$$inline: true
    		});

    	textinput3.$on("input", /*input_handler_3*/ ctx[18]);

    	textinput4 = new TextInput({
    			props: {
    				controlType: "textarea",
    				rows: 3,
    				label: "Description",
    				id: "description",
    				valid: /*descriptionValid*/ ctx[8],
    				validityMessage: "Please enter a valid description.",
    				value: /*description*/ ctx[3]
    			},
    			$$inline: true
    		});

    	textinput4.$on("input", /*input_handler_4*/ ctx[19]);

    	const block = {
    		c: function create() {
    			form = element$1("form");
    			create_component(textinput0.$$.fragment);
    			t0 = space$1();
    			create_component(textinput1.$$.fragment);
    			t1 = space$1();
    			create_component(textinput2.$$.fragment);
    			t2 = space$1();
    			create_component(textinput3.$$.fragment);
    			t3 = space$1();
    			create_component(textinput4.$$.fragment);
    			t4 = space$1();
    			attr_dev$1(form, "class", "svelte-no1xoc");
    			add_location$1(form, file$5, 82, 2, 1839);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, form, anchor);
    			mount_component$1(textinput0, form, null);
    			append_dev$1(form, t0);
    			mount_component$1(textinput1, form, null);
    			append_dev$1(form, t1);
    			mount_component$1(textinput2, form, null);
    			append_dev$1(form, t2);
    			mount_component$1(textinput3, form, null);
    			append_dev$1(form, t3);
    			mount_component$1(textinput4, form, null);
    			insert_dev$1(target, t4, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev$1(form, "submit", prevent_default(/*submitForm*/ ctx[12]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const textinput0_changes = {};
    			if (dirty & /*titleValid*/ 64) textinput0_changes.valid = /*titleValid*/ ctx[6];
    			if (dirty & /*title*/ 2) textinput0_changes.value = /*title*/ ctx[1];
    			textinput0.$set(textinput0_changes);
    			const textinput1_changes = {};
    			if (dirty & /*subtitleValid*/ 128) textinput1_changes.valid = /*subtitleValid*/ ctx[7];
    			if (dirty & /*subtitle*/ 4) textinput1_changes.value = /*subtitle*/ ctx[2];
    			textinput1.$set(textinput1_changes);
    			const textinput2_changes = {};
    			if (dirty & /*imageUrlValid*/ 512) textinput2_changes.valid = /*imageUrlValid*/ ctx[9];
    			if (dirty & /*imageUrl*/ 16) textinput2_changes.value = /*imageUrl*/ ctx[4];
    			textinput2.$set(textinput2_changes);
    			const textinput3_changes = {};
    			if (dirty & /*emailValid*/ 1024) textinput3_changes.valid = /*emailValid*/ ctx[10];
    			if (dirty & /*email*/ 32) textinput3_changes.value = /*email*/ ctx[5];
    			textinput3.$set(textinput3_changes);
    			const textinput4_changes = {};
    			if (dirty & /*descriptionValid*/ 256) textinput4_changes.valid = /*descriptionValid*/ ctx[8];
    			if (dirty & /*description*/ 8) textinput4_changes.value = /*description*/ ctx[3];
    			textinput4.$set(textinput4_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(textinput0.$$.fragment, local);
    			transition_in$1(textinput1.$$.fragment, local);
    			transition_in$1(textinput2.$$.fragment, local);
    			transition_in$1(textinput3.$$.fragment, local);
    			transition_in$1(textinput4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(textinput0.$$.fragment, local);
    			transition_out$1(textinput1.$$.fragment, local);
    			transition_out$1(textinput2.$$.fragment, local);
    			transition_out$1(textinput3.$$.fragment, local);
    			transition_out$1(textinput4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(form);
    			destroy_component$1(textinput0);
    			destroy_component$1(textinput1);
    			destroy_component$1(textinput2);
    			destroy_component$1(textinput3);
    			destroy_component$1(textinput4);
    			if (detaching) detach_dev$1(t4);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(82:0) <Modal title=\\\"Edit Meetup\\\" on:cancel>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				title: "Edit Meetup",
    				$$slots: {
    					default: [create_default_slot$2],
    					footer: [create_footer_slot]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	modal.$on("cancel", /*cancel_handler*/ ctx[20]);

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component$1(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, id, formIsValid, descriptionValid, description, emailValid, email, imageUrlValid, imageUrl, subtitleValid, subtitle, titleValid, title*/ 33558527) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component$1(modal, detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { id = null } = $$props;
    	let title = "";
    	let subtitle = "";
    	let description = "";
    	let imageUrl = "";
    	let address = "";
    	let email = "";
    	let isFavorite = false;

    	if (id) {
    		const unsubscribe = meetupsStore.subscribe(items => {
    			const selectedMeetup = items.find(i => i.id === id);
    			$$invalidate(1, title = selectedMeetup.title);
    			$$invalidate(2, subtitle = selectedMeetup.subtitle);
    			$$invalidate(3, description = selectedMeetup.description);
    			$$invalidate(4, imageUrl = selectedMeetup.imageUrl);
    			$$invalidate(21, address = selectedMeetup.address);
    			$$invalidate(5, email = selectedMeetup.contactEmail);
    		});

    		unsubscribe();
    	}

    	const dispatch = createEventDispatcher();

    	function submitForm() {
    		const meetupData = {
    			title,
    			subtitle,
    			description,
    			contactEmail: email,
    			imageUrl,
    			address
    		};

    		if (id) {
    			meetupsStore.updateMeetup(id, meetupData);
    		} else {
    			meetupsStore.addMeetup(meetupData);
    		}

    		dispatch("save");
    	}

    	function cancel() {
    		dispatch("cancel");
    	}

    	function deleteMeetup() {
    		meetupsStore.removeMeetup(id);
    		dispatch("save");
    	}

    	const writable_props = ["id"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EditMeetup> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("EditMeetup", $$slots, []);
    	const input_handler = event => $$invalidate(1, title = event.target.value);
    	const input_handler_1 = event => $$invalidate(2, subtitle = event.target.value);
    	const input_handler_2 = event => $$invalidate(4, imageUrl = event.target.value);
    	const input_handler_3 = event => $$invalidate(5, email = event.target.value);
    	const input_handler_4 = event => $$invalidate(3, description = event.target.value);

    	function cancel_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({
    		meetups: meetupsStore,
    		Button,
    		TextInput,
    		createEventDispatcher,
    		Modal,
    		isEmpty,
    		isValidEmail,
    		id,
    		title,
    		subtitle,
    		description,
    		imageUrl,
    		address,
    		email,
    		isFavorite,
    		dispatch,
    		submitForm,
    		cancel,
    		deleteMeetup,
    		titleValid,
    		subtitleValid,
    		addressValid,
    		descriptionValid,
    		imageUrlValid,
    		emailValid,
    		formIsValid
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("subtitle" in $$props) $$invalidate(2, subtitle = $$props.subtitle);
    		if ("description" in $$props) $$invalidate(3, description = $$props.description);
    		if ("imageUrl" in $$props) $$invalidate(4, imageUrl = $$props.imageUrl);
    		if ("address" in $$props) $$invalidate(21, address = $$props.address);
    		if ("email" in $$props) $$invalidate(5, email = $$props.email);
    		if ("isFavorite" in $$props) isFavorite = $$props.isFavorite;
    		if ("titleValid" in $$props) $$invalidate(6, titleValid = $$props.titleValid);
    		if ("subtitleValid" in $$props) $$invalidate(7, subtitleValid = $$props.subtitleValid);
    		if ("addressValid" in $$props) addressValid = $$props.addressValid;
    		if ("descriptionValid" in $$props) $$invalidate(8, descriptionValid = $$props.descriptionValid);
    		if ("imageUrlValid" in $$props) $$invalidate(9, imageUrlValid = $$props.imageUrlValid);
    		if ("emailValid" in $$props) $$invalidate(10, emailValid = $$props.emailValid);
    		if ("formIsValid" in $$props) $$invalidate(11, formIsValid = $$props.formIsValid);
    	};

    	let titleValid;
    	let subtitleValid;
    	let addressValid;
    	let descriptionValid;
    	let imageUrlValid;
    	let emailValid;
    	let formIsValid;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*title*/ 2) {
    			 $$invalidate(6, titleValid = !isEmpty(title));
    		}

    		if ($$self.$$.dirty & /*subtitle*/ 4) {
    			 $$invalidate(7, subtitleValid = !isEmpty(subtitle));
    		}

    		if ($$self.$$.dirty & /*address*/ 2097152) {
    			 addressValid = !isEmpty(address);
    		}

    		if ($$self.$$.dirty & /*description*/ 8) {
    			 $$invalidate(8, descriptionValid = !isEmpty(description));
    		}

    		if ($$self.$$.dirty & /*imageUrl*/ 16) {
    			 $$invalidate(9, imageUrlValid = !isEmpty(imageUrl));
    		}

    		if ($$self.$$.dirty & /*email*/ 32) {
    			 $$invalidate(10, emailValid = isValidEmail(email));
    		}

    		if ($$self.$$.dirty & /*titleValid, subtitleValid, descriptionValid, imageUrlValid, emailValid*/ 1984) {
    			 $$invalidate(11, formIsValid = titleValid && subtitleValid && descriptionValid && imageUrlValid && emailValid);
    		}
    	};

    	return [
    		id,
    		title,
    		subtitle,
    		description,
    		imageUrl,
    		email,
    		titleValid,
    		subtitleValid,
    		descriptionValid,
    		imageUrlValid,
    		emailValid,
    		formIsValid,
    		submitForm,
    		cancel,
    		deleteMeetup,
    		input_handler,
    		input_handler_1,
    		input_handler_2,
    		input_handler_3,
    		input_handler_4,
    		cancel_handler
    	];
    }

    class EditMeetup extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$5, create_fragment$5, safe_not_equal$1, { id: 0 });

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditMeetup",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get id() {
    		throw new Error("<EditMeetup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<EditMeetup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/Badge.svelte generated by Svelte v3.24.1 */

    const file$6 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/Badge.svelte";

    function create_fragment$6(ctx) {
    	let span;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			span = element$1("span");
    			if (default_slot) default_slot.c();
    			attr_dev$1(span, "class", "svelte-18dcboe");
    			add_location$1(span, file$6, 14, 0, 262);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, span, anchor);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[0], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(span);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Badge> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("Badge", $$slots, ['default']);

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, $$slots];
    }

    class Badge extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$6, create_fragment$6, safe_not_equal$1, {});

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Badge",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/Meetups/MeetupItem.svelte generated by Svelte v3.24.1 */
    const file$7 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/Meetups/MeetupItem.svelte";

    // (85:6) {#if isFav}
    function create_if_block$3(ctx) {
    	let badge;
    	let current;

    	badge = new Badge({
    			props: {
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(badge.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component$1(badge, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(badge.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(badge.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component$1(badge, detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(85:6) {#if isFav}",
    		ctx
    	});

    	return block;
    }

    // (86:8) <Badge>
    function create_default_slot_3$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text$1("FAVORITE");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(t);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(86:8) <Badge>",
    		ctx
    	});

    	return block;
    }

    // (99:4) <Button mode="outline" type="button" on:click={() => dispatch('edit', id)}>
    function create_default_slot_2$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text$1("Edit");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(t);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(99:4) <Button mode=\\\"outline\\\" type=\\\"button\\\" on:click={() => dispatch('edit', id)}>",
    		ctx
    	});

    	return block;
    }

    // (102:4) <Button type="button" on:click={() => dispatch('show-details', id)}>
    function create_default_slot_1$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text$1("Show Details");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(t);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$2.name,
    		type: "slot",
    		source: "(102:4) <Button type=\\\"button\\\" on:click={() => dispatch('show-details', id)}>",
    		ctx
    	});

    	return block;
    }

    // (105:4) <Button       type="button"       color={isFav ? null : 'success'}       mode="outline"       on:click={toggleFavorite}>
    function create_default_slot$3(ctx) {
    	let t_value = (/*isFav*/ ctx[6] ? "Unfavorite" : "Favorite") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text$1(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*isFav*/ 64 && t_value !== (t_value = (/*isFav*/ ctx[6] ? "Unfavorite" : "Favorite") + "")) set_data_dev$1(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(t);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(105:4) <Button       type=\\\"button\\\"       color={isFav ? null : 'success'}       mode=\\\"outline\\\"       on:click={toggleFavorite}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let article;
    	let header;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let h2;
    	let t3;
    	let t4;
    	let p0;
    	let t5;
    	let t6;
    	let div0;
    	let img;
    	let img_src_value;
    	let t7;
    	let div1;
    	let p1;
    	let t8;
    	let t9;
    	let footer;
    	let button0;
    	let t10;
    	let button1;
    	let t11;
    	let button2;
    	let current;
    	let if_block = /*isFav*/ ctx[6] && create_if_block$3(ctx);

    	button0 = new Button({
    			props: {
    				mode: "outline",
    				type: "button",
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*click_handler*/ ctx[10]);

    	button1 = new Button({
    			props: {
    				type: "button",
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*click_handler_1*/ ctx[11]);

    	button2 = new Button({
    			props: {
    				type: "button",
    				color: /*isFav*/ ctx[6] ? null : "success",
    				mode: "outline",
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button2.$on("click", /*toggleFavorite*/ ctx[8]);

    	const block = {
    		c: function create() {
    			article = element$1("article");
    			header = element$1("header");
    			h1 = element$1("h1");
    			t0 = text$1(/*title*/ ctx[1]);
    			t1 = space$1();
    			if (if_block) if_block.c();
    			t2 = space$1();
    			h2 = element$1("h2");
    			t3 = text$1(/*subtitle*/ ctx[2]);
    			t4 = space$1();
    			p0 = element$1("p");
    			t5 = text$1(/*address*/ ctx[5]);
    			t6 = space$1();
    			div0 = element$1("div");
    			img = element$1("img");
    			t7 = space$1();
    			div1 = element$1("div");
    			p1 = element$1("p");
    			t8 = text$1(/*description*/ ctx[3]);
    			t9 = space$1();
    			footer = element$1("footer");
    			create_component(button0.$$.fragment);
    			t10 = space$1();
    			create_component(button1.$$.fragment);
    			t11 = space$1();
    			create_component(button2.$$.fragment);
    			attr_dev$1(h1, "class", "svelte-66sxxp");
    			add_location$1(h1, file$7, 82, 4, 1260);
    			attr_dev$1(h2, "class", "svelte-66sxxp");
    			add_location$1(h2, file$7, 88, 4, 1355);
    			attr_dev$1(p0, "class", "svelte-66sxxp");
    			add_location$1(p0, file$7, 89, 4, 1379);
    			attr_dev$1(header, "class", "svelte-66sxxp");
    			add_location$1(header, file$7, 81, 2, 1247);
    			if (img.src !== (img_src_value = /*imageUrl*/ ctx[4])) attr_dev$1(img, "src", img_src_value);
    			attr_dev$1(img, "alt", /*title*/ ctx[1]);
    			attr_dev$1(img, "class", "svelte-66sxxp");
    			add_location$1(img, file$7, 92, 4, 1434);
    			attr_dev$1(div0, "class", "image svelte-66sxxp");
    			add_location$1(div0, file$7, 91, 2, 1410);
    			attr_dev$1(p1, "class", "svelte-66sxxp");
    			add_location$1(p1, file$7, 95, 4, 1506);
    			attr_dev$1(div1, "class", "content svelte-66sxxp");
    			add_location$1(div1, file$7, 94, 2, 1480);
    			attr_dev$1(footer, "class", "svelte-66sxxp");
    			add_location$1(footer, file$7, 97, 2, 1538);
    			attr_dev$1(article, "class", "svelte-66sxxp");
    			add_location$1(article, file$7, 80, 0, 1235);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, article, anchor);
    			append_dev$1(article, header);
    			append_dev$1(header, h1);
    			append_dev$1(h1, t0);
    			append_dev$1(h1, t1);
    			if (if_block) if_block.m(h1, null);
    			append_dev$1(header, t2);
    			append_dev$1(header, h2);
    			append_dev$1(h2, t3);
    			append_dev$1(header, t4);
    			append_dev$1(header, p0);
    			append_dev$1(p0, t5);
    			append_dev$1(article, t6);
    			append_dev$1(article, div0);
    			append_dev$1(div0, img);
    			append_dev$1(article, t7);
    			append_dev$1(article, div1);
    			append_dev$1(div1, p1);
    			append_dev$1(p1, t8);
    			append_dev$1(article, t9);
    			append_dev$1(article, footer);
    			mount_component$1(button0, footer, null);
    			append_dev$1(footer, t10);
    			mount_component$1(button1, footer, null);
    			append_dev$1(footer, t11);
    			mount_component$1(button2, footer, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 2) set_data_dev$1(t0, /*title*/ ctx[1]);

    			if (/*isFav*/ ctx[6]) {
    				if (if_block) {
    					if (dirty & /*isFav*/ 64) {
    						transition_in$1(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in$1(if_block, 1);
    					if_block.m(h1, null);
    				}
    			} else if (if_block) {
    				group_outros$1();

    				transition_out$1(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros$1();
    			}

    			if (!current || dirty & /*subtitle*/ 4) set_data_dev$1(t3, /*subtitle*/ ctx[2]);
    			if (!current || dirty & /*address*/ 32) set_data_dev$1(t5, /*address*/ ctx[5]);

    			if (!current || dirty & /*imageUrl*/ 16 && img.src !== (img_src_value = /*imageUrl*/ ctx[4])) {
    				attr_dev$1(img, "src", img_src_value);
    			}

    			if (!current || dirty & /*title*/ 2) {
    				attr_dev$1(img, "alt", /*title*/ ctx[1]);
    			}

    			if (!current || dirty & /*description*/ 8) set_data_dev$1(t8, /*description*/ ctx[3]);
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			const button2_changes = {};
    			if (dirty & /*isFav*/ 64) button2_changes.color = /*isFav*/ ctx[6] ? null : "success";

    			if (dirty & /*$$scope, isFav*/ 4160) {
    				button2_changes.$$scope = { dirty, ctx };
    			}

    			button2.$set(button2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(if_block);
    			transition_in$1(button0.$$.fragment, local);
    			transition_in$1(button1.$$.fragment, local);
    			transition_in$1(button2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(if_block);
    			transition_out$1(button0.$$.fragment, local);
    			transition_out$1(button1.$$.fragment, local);
    			transition_out$1(button2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(article);
    			if (if_block) if_block.d();
    			destroy_component$1(button0);
    			destroy_component$1(button1);
    			destroy_component$1(button2);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { id } = $$props;
    	let { title } = $$props;
    	let { subtitle } = $$props;
    	let { description } = $$props;
    	let { imageUrl } = $$props;
    	let { address } = $$props;
    	let { email } = $$props;
    	let { isFav } = $$props;
    	const dispatch = createEventDispatcher();

    	function toggleFavorite() {
    		meetupsStore.toggleFavorite(id);
    	}

    	const writable_props = [
    		"id",
    		"title",
    		"subtitle",
    		"description",
    		"imageUrl",
    		"address",
    		"email",
    		"isFav"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MeetupItem> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("MeetupItem", $$slots, []);
    	const click_handler = () => dispatch("edit", id);
    	const click_handler_1 = () => dispatch("show-details", id);

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("subtitle" in $$props) $$invalidate(2, subtitle = $$props.subtitle);
    		if ("description" in $$props) $$invalidate(3, description = $$props.description);
    		if ("imageUrl" in $$props) $$invalidate(4, imageUrl = $$props.imageUrl);
    		if ("address" in $$props) $$invalidate(5, address = $$props.address);
    		if ("email" in $$props) $$invalidate(9, email = $$props.email);
    		if ("isFav" in $$props) $$invalidate(6, isFav = $$props.isFav);
    	};

    	$$self.$capture_state = () => ({
    		meetups: meetupsStore,
    		createEventDispatcher,
    		Button,
    		Badge,
    		id,
    		title,
    		subtitle,
    		description,
    		imageUrl,
    		address,
    		email,
    		isFav,
    		dispatch,
    		toggleFavorite
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("subtitle" in $$props) $$invalidate(2, subtitle = $$props.subtitle);
    		if ("description" in $$props) $$invalidate(3, description = $$props.description);
    		if ("imageUrl" in $$props) $$invalidate(4, imageUrl = $$props.imageUrl);
    		if ("address" in $$props) $$invalidate(5, address = $$props.address);
    		if ("email" in $$props) $$invalidate(9, email = $$props.email);
    		if ("isFav" in $$props) $$invalidate(6, isFav = $$props.isFav);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		id,
    		title,
    		subtitle,
    		description,
    		imageUrl,
    		address,
    		isFav,
    		dispatch,
    		toggleFavorite,
    		email,
    		click_handler,
    		click_handler_1
    	];
    }

    class MeetupItem extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);

    		init$1(this, options, instance$7, create_fragment$7, safe_not_equal$1, {
    			id: 0,
    			title: 1,
    			subtitle: 2,
    			description: 3,
    			imageUrl: 4,
    			address: 5,
    			email: 9,
    			isFav: 6
    		});

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MeetupItem",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[0] === undefined && !("id" in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'id'");
    		}

    		if (/*title*/ ctx[1] === undefined && !("title" in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'title'");
    		}

    		if (/*subtitle*/ ctx[2] === undefined && !("subtitle" in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'subtitle'");
    		}

    		if (/*description*/ ctx[3] === undefined && !("description" in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'description'");
    		}

    		if (/*imageUrl*/ ctx[4] === undefined && !("imageUrl" in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'imageUrl'");
    		}

    		if (/*address*/ ctx[5] === undefined && !("address" in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'address'");
    		}

    		if (/*email*/ ctx[9] === undefined && !("email" in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'email'");
    		}

    		if (/*isFav*/ ctx[6] === undefined && !("isFav" in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'isFav'");
    		}
    	}

    	get id() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get subtitle() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set subtitle(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get description() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imageUrl() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imageUrl(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get address() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set address(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get email() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set email(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isFav() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isFav(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/Meetups/MeetupFilter.svelte generated by Svelte v3.24.1 */
    const file$8 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/Meetups/MeetupFilter.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let button0;
    	let t1;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			button0 = element$1("button");
    			button0.textContent = "All";
    			t1 = space$1();
    			button1 = element$1("button");
    			button1.textContent = "Favorites";
    			attr_dev$1(button0, "type", "button");
    			attr_dev$1(button0, "class", "svelte-wewm0q");
    			toggle_class(button0, "active", /*selectedButton*/ ctx[0] === 1);
    			add_location$1(button0, file$8, 44, 2, 643);
    			attr_dev$1(button1, "type", "button");
    			attr_dev$1(button1, "class", "svelte-wewm0q");
    			add_location$1(button1, file$8, 53, 2, 816);
    			attr_dev$1(div, "class", "svelte-wewm0q");
    			add_location$1(div, file$8, 43, 0, 635);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, div, anchor);
    			append_dev$1(div, button0);
    			append_dev$1(div, t1);
    			append_dev$1(div, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev$1(button0, "click", /*click_handler*/ ctx[2], false, false, false),
    					listen_dev$1(button1, "click", /*click_handler_1*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*selectedButton*/ 1) {
    				toggle_class(button0, "active", /*selectedButton*/ ctx[0] === 1);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(div);
    			mounted = false;
    			run_all$1(dispose);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let selectedButton = 0;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MeetupFilter> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("MeetupFilter", $$slots, []);

    	const click_handler = () => {
    		dispatch("select", 0);
    		$$invalidate(0, selectedButton = 0);
    	};

    	const click_handler_1 = () => {
    		dispatch("select", 1);
    		$$invalidate(0, selectedButton = 1);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		selectedButton
    	});

    	$$self.$inject_state = $$props => {
    		if ("selectedButton" in $$props) $$invalidate(0, selectedButton = $$props.selectedButton);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [selectedButton, dispatch, click_handler, click_handler_1];
    }

    class MeetupFilter extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$8, create_fragment$8, safe_not_equal$1, {});

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MeetupFilter",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/Meetups/MeetupGrid.svelte generated by Svelte v3.24.1 */
    const file$9 = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/Meetups/MeetupGrid.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (43:2) <Button on:click={() => dispatch('add')}>
    function create_default_slot$4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text$1("New Meetup");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(t);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(43:2) <Button on:click={() => dispatch('add')}>",
    		ctx
    	});

    	return block;
    }

    // (47:2) {#each filteredMeetups as meetup}
    function create_each_block$1(ctx) {
    	let meetupitem;
    	let current;

    	meetupitem = new MeetupItem({
    			props: {
    				id: /*meetup*/ ctx[8].id,
    				title: /*meetup*/ ctx[8].title,
    				subtitle: /*meetup*/ ctx[8].subtitle,
    				description: /*meetup*/ ctx[8].description,
    				imageUrl: /*meetup*/ ctx[8].imageUrl,
    				email: /*meetup*/ ctx[8].contactEmail,
    				address: /*meetup*/ ctx[8].address,
    				isFav: /*meetup*/ ctx[8].isFavorite
    			},
    			$$inline: true
    		});

    	meetupitem.$on("show-details", /*show_details_handler*/ ctx[5]);
    	meetupitem.$on("edit", /*edit_handler*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(meetupitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component$1(meetupitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const meetupitem_changes = {};
    			if (dirty & /*filteredMeetups*/ 1) meetupitem_changes.id = /*meetup*/ ctx[8].id;
    			if (dirty & /*filteredMeetups*/ 1) meetupitem_changes.title = /*meetup*/ ctx[8].title;
    			if (dirty & /*filteredMeetups*/ 1) meetupitem_changes.subtitle = /*meetup*/ ctx[8].subtitle;
    			if (dirty & /*filteredMeetups*/ 1) meetupitem_changes.description = /*meetup*/ ctx[8].description;
    			if (dirty & /*filteredMeetups*/ 1) meetupitem_changes.imageUrl = /*meetup*/ ctx[8].imageUrl;
    			if (dirty & /*filteredMeetups*/ 1) meetupitem_changes.email = /*meetup*/ ctx[8].contactEmail;
    			if (dirty & /*filteredMeetups*/ 1) meetupitem_changes.address = /*meetup*/ ctx[8].address;
    			if (dirty & /*filteredMeetups*/ 1) meetupitem_changes.isFav = /*meetup*/ ctx[8].isFavorite;
    			meetupitem.$set(meetupitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(meetupitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(meetupitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component$1(meetupitem, detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(47:2) {#each filteredMeetups as meetup}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let section0;
    	let meetupfilter;
    	let t0;
    	let button;
    	let t1;
    	let section1;
    	let current;
    	meetupfilter = new MeetupFilter({ $$inline: true });
    	meetupfilter.$on("select", /*setFilter*/ ctx[1]);

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot$4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*click_handler*/ ctx[4]);
    	let each_value = /*filteredMeetups*/ ctx[0];
    	validate_each_argument$1(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out$1(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			section0 = element$1("section");
    			create_component(meetupfilter.$$.fragment);
    			t0 = space$1();
    			create_component(button.$$.fragment);
    			t1 = space$1();
    			section1 = element$1("section");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev$1(section0, "id", "meetup-controls");
    			attr_dev$1(section0, "class", "svelte-mz8p5t");
    			add_location$1(section0, file$9, 39, 0, 788);
    			attr_dev$1(section1, "id", "meetups");
    			attr_dev$1(section1, "class", "svelte-mz8p5t");
    			add_location$1(section1, file$9, 45, 0, 936);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, section0, anchor);
    			mount_component$1(meetupfilter, section0, null);
    			append_dev$1(section0, t0);
    			mount_component$1(button, section0, null);
    			insert_dev$1(target, t1, anchor);
    			insert_dev$1(target, section1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);

    			if (dirty & /*filteredMeetups*/ 1) {
    				each_value = /*filteredMeetups*/ ctx[0];
    				validate_each_argument$1(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in$1(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in$1(each_blocks[i], 1);
    						each_blocks[i].m(section1, null);
    					}
    				}

    				group_outros$1();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros$1();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(meetupfilter.$$.fragment, local);
    			transition_in$1(button.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in$1(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(meetupfilter.$$.fragment, local);
    			transition_out$1(button.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out$1(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(section0);
    			destroy_component$1(meetupfilter);
    			destroy_component$1(button);
    			if (detaching) detach_dev$1(t1);
    			if (detaching) detach_dev$1(section1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { meetups = [] } = $$props;
    	let favsOnly = false;

    	function setFilter(event) {
    		$$invalidate(7, favsOnly = event.detail === 1);
    	}

    	const dispatch = createEventDispatcher();
    	const writable_props = ["meetups"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MeetupGrid> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("MeetupGrid", $$slots, []);
    	const click_handler = () => dispatch("add");

    	function show_details_handler(event) {
    		bubble($$self, event);
    	}

    	function edit_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("meetups" in $$props) $$invalidate(3, meetups = $$props.meetups);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Button,
    		MeetupItem,
    		MeetupFilter,
    		meetups,
    		favsOnly,
    		setFilter,
    		dispatch,
    		filteredMeetups
    	});

    	$$self.$inject_state = $$props => {
    		if ("meetups" in $$props) $$invalidate(3, meetups = $$props.meetups);
    		if ("favsOnly" in $$props) $$invalidate(7, favsOnly = $$props.favsOnly);
    		if ("filteredMeetups" in $$props) $$invalidate(0, filteredMeetups = $$props.filteredMeetups);
    	};

    	let filteredMeetups;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*favsOnly, meetups*/ 136) {
    			 $$invalidate(0, filteredMeetups = favsOnly ? meetups.filter(m => m.isFavorite) : meetups);
    		}
    	};

    	return [
    		filteredMeetups,
    		setFilter,
    		dispatch,
    		meetups,
    		click_handler,
    		show_details_handler,
    		edit_handler
    	];
    }

    class MeetupGrid extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$9, create_fragment$9, safe_not_equal$1, { meetups: 3 });

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MeetupGrid",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get meetups() {
    		throw new Error("<MeetupGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set meetups(value) {
    		throw new Error("<MeetupGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/Header.svelte generated by Svelte v3.24.1 */

    const file$a = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/UI/Header.svelte";

    function create_fragment$a(ctx) {
    	let header;
    	let h1;

    	const block = {
    		c: function create() {
    			header = element$1("header");
    			h1 = element$1("h1");
    			h1.textContent = "MeetUS";
    			attr_dev$1(h1, "class", "svelte-dmsz71");
    			add_location$1(h1, file$a, 22, 2, 354);
    			attr_dev$1(header, "class", "svelte-dmsz71");
    			add_location$1(header, file$a, 21, 0, 343);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev$1(target, header, anchor);
    			append_dev$1(header, h1);
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev$1(header);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("Header", $$slots, []);
    	return [];
    }

    class Header extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$a, create_fragment$a, safe_not_equal$1, {});

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/App.svelte generated by Svelte v3.24.1 */
    const file$b = "Users/nam.nguyenhoai/TeamFile/practices/svelte-practices/meetup-app/src/App.svelte";

    // (63:2) {:else}
    function create_else_block$2(ctx) {
    	let meetupdetails;
    	let current;

    	meetupdetails = new MeetupDetails({
    			props: { id: /*pageData*/ ctx[3].id },
    			$$inline: true
    		});

    	meetupdetails.$on("closeDetails", /*closeDetails*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(meetupdetails.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component$1(meetupdetails, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const meetupdetails_changes = {};
    			if (dirty & /*pageData*/ 8) meetupdetails_changes.id = /*pageData*/ ctx[3].id;
    			meetupdetails.$set(meetupdetails_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(meetupdetails.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(meetupdetails.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component$1(meetupdetails, detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(63:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (52:2) {#if page === 'overview'}
    function create_if_block$4(ctx) {
    	let t;
    	let meetupgrid;
    	let current;
    	let if_block = /*editMode*/ ctx[0] === "edit" && create_if_block_1$1(ctx);

    	meetupgrid = new MeetupGrid({
    			props: { meetups: /*$meetups*/ ctx[4] },
    			$$inline: true
    		});

    	meetupgrid.$on("show-details", /*showDetails*/ ctx[7]);
    	meetupgrid.$on("edit", /*startEdit*/ ctx[9]);
    	meetupgrid.$on("add", /*add_handler*/ ctx[10]);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space$1();
    			create_component(meetupgrid.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev$1(target, t, anchor);
    			mount_component$1(meetupgrid, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*editMode*/ ctx[0] === "edit") {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*editMode*/ 1) {
    						transition_in$1(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					transition_in$1(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros$1();

    				transition_out$1(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros$1();
    			}

    			const meetupgrid_changes = {};
    			if (dirty & /*$meetups*/ 16) meetupgrid_changes.meetups = /*$meetups*/ ctx[4];
    			meetupgrid.$set(meetupgrid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(if_block);
    			transition_in$1(meetupgrid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(if_block);
    			transition_out$1(meetupgrid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev$1(t);
    			destroy_component$1(meetupgrid, detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(52:2) {#if page === 'overview'}",
    		ctx
    	});

    	return block;
    }

    // (53:4) {#if editMode === 'edit'}
    function create_if_block_1$1(ctx) {
    	let editmeetup;
    	let current;

    	editmeetup = new EditMeetup({
    			props: { id: /*editedId*/ ctx[2] },
    			$$inline: true
    		});

    	editmeetup.$on("save", /*saveMeetup*/ ctx[5]);
    	editmeetup.$on("cancel", /*cancelEdit*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(editmeetup.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component$1(editmeetup, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const editmeetup_changes = {};
    			if (dirty & /*editedId*/ 4) editmeetup_changes.id = /*editedId*/ ctx[2];
    			editmeetup.$set(editmeetup_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(editmeetup.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(editmeetup.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component$1(editmeetup, detaching);
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(53:4) {#if editMode === 'edit'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let header;
    	let t;
    	let main;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	header = new Header({ $$inline: true });
    	const if_block_creators = [create_if_block$4, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*page*/ ctx[1] === "overview") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t = space$1();
    			main = element$1("main");
    			if_block.c();
    			attr_dev$1(main, "class", "svelte-1r5xu04");
    			add_location$1(main, file$b, 50, 0, 964);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component$1(header, target, anchor);
    			insert_dev$1(target, t, anchor);
    			insert_dev$1(target, main, anchor);
    			if_blocks[current_block_type_index].m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros$1();

    				transition_out$1(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros$1();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in$1(if_block, 1);
    				if_block.m(main, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(header.$$.fragment, local);
    			transition_in$1(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out$1(header.$$.fragment, local);
    			transition_out$1(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component$1(header, detaching);
    			if (detaching) detach_dev$1(t);
    			if (detaching) detach_dev$1(main);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev$1("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let $meetups;
    	validate_store$1(meetupsStore, "meetups");
    	component_subscribe$1($$self, meetupsStore, $$value => $$invalidate(4, $meetups = $$value));
    	let editMode = null;
    	let page = "overview";
    	let editedId = null;
    	let pageData = {};

    	//   let meetups = ;
    	function saveMeetup(event) {
    		$$invalidate(0, editMode = null);
    		$$invalidate(2, editedId = null);
    	}

    	function cancelEdit() {
    		$$invalidate(0, editMode = null);
    		$$invalidate(2, editedId = null);
    	}

    	function showDetails(event) {
    		$$invalidate(1, page = "details");
    		$$invalidate(3, pageData.id = event.detail, pageData);
    	}

    	function closeDetails() {
    		$$invalidate(1, page = "overview");
    		$$invalidate(3, pageData = {});
    	}

    	function startEdit(event) {
    		$$invalidate(0, editMode = "edit");
    		$$invalidate(2, editedId = event.detail);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots$1("App", $$slots, []);

    	const add_handler = () => {
    		$$invalidate(0, editMode = "edit");
    	};

    	$$self.$capture_state = () => ({
    		MeetupDetails,
    		EditMeetup,
    		MeetupGrid,
    		Header,
    		TextInput,
    		Button,
    		meetups: meetupsStore,
    		editMode,
    		page,
    		editedId,
    		pageData,
    		saveMeetup,
    		cancelEdit,
    		showDetails,
    		closeDetails,
    		startEdit,
    		$meetups
    	});

    	$$self.$inject_state = $$props => {
    		if ("editMode" in $$props) $$invalidate(0, editMode = $$props.editMode);
    		if ("page" in $$props) $$invalidate(1, page = $$props.page);
    		if ("editedId" in $$props) $$invalidate(2, editedId = $$props.editedId);
    		if ("pageData" in $$props) $$invalidate(3, pageData = $$props.pageData);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		editMode,
    		page,
    		editedId,
    		pageData,
    		$meetups,
    		saveMeetup,
    		cancelEdit,
    		showDetails,
    		closeDetails,
    		startEdit,
    		add_handler
    	];
    }

    class App extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$b, create_fragment$b, safe_not_equal$1, {});

    		dispatch_dev$1("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.1 */

    const { console: console_1 } = globals;
    const file$c = "src/App.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (51:0) {#if showParagraph}
    function create_if_block$5(ctx) {
    	let p;
    	let p_intro;
    	let p_outro;
    	let current;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Can you see me?";
    			add_location(p, file$c, 51, 2, 1064);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (p_outro) p_outro.end(1);
    				if (!p_intro) p_intro = create_in_transition(p, fade, {});
    				p_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (p_intro) p_intro.invalidate();
    			p_outro = create_out_transition(p, fly, { x: 300 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching && p_outro) p_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(51:0) {#if showParagraph}",
    		ctx
    	});

    	return block;
    }

    // (59:0) {#each boxes as box (box)}
    function create_each_block$2(key_1, ctx) {
    	let div;
    	let t0_value = /*box*/ ctx[12] + "";
    	let t0;
    	let t1;
    	let div_transition;
    	let rect;
    	let stop_animation = noop;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "svelte-1w9ha70");
    			add_location(div, file$c, 59, 2, 1270);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						div,
    						"click",
    						function () {
    							if (is_function(/*discard*/ ctx[4].bind(this, /*box*/ ctx[12]))) /*discard*/ ctx[4].bind(this, /*box*/ ctx[12]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(div, "introstart", /*introstart_handler*/ ctx[7], false, false, false),
    					listen_dev(div, "introend", /*introend_handler*/ ctx[8], false, false, false),
    					listen_dev(div, "outrostart", /*outrostart_handler*/ ctx[9], false, false, false),
    					listen_dev(div, "outroend", /*outroend_handler*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*boxes*/ 4) && t0_value !== (t0_value = /*box*/ ctx[12] + "")) set_data_dev(t0, t0_value);
    		},
    		r: function measure() {
    			rect = div.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(div);
    			stop_animation();
    			add_transform(div, rect);
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(div, rect, flip, { duration: 300 });
    		},
    		i: function intro(local) {
    			if (current) return;

    			if (local) {
    				add_render_callback(() => {
    					if (!div_transition) div_transition = create_bidirectional_transition(
    						div,
    						fly,
    						{
    							x: 200,
    							y: 0,
    							duration: 400,
    							easing: cubicIn
    						},
    						true
    					);

    					div_transition.run(1);
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			if (local) {
    				if (!div_transition) div_transition = create_bidirectional_transition(
    					div,
    					fly,
    					{
    						x: 200,
    						y: 0,
    						duration: 400,
    						easing: cubicIn
    					},
    					false
    				);

    				div_transition.run(0);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(59:0) {#each boxes as box (box)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let button0;
    	let t1;
    	let t2;
    	let hr;
    	let t3;
    	let input;
    	let t4;
    	let button1;
    	let t6;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*showParagraph*/ ctx[1] && create_if_block$5(ctx);
    	let each_value = /*boxes*/ ctx[2];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*box*/ ctx[12];
    	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Toggle";
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			hr = element("hr");
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			button1 = element("button");
    			button1.textContent = "Add";
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(button0, file$c, 49, 0, 968);
    			add_location(hr, file$c, 53, 0, 1122);
    			attr_dev(input, "type", "text");
    			add_location(input, file$c, 55, 0, 1130);
    			add_location(button1, file$c, 56, 0, 1173);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, input, anchor);
    			/*input_binding*/ ctx[6](input);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t6, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[5], false, false, false),
    					listen_dev(button1, "click", /*addBox*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showParagraph*/ ctx[1]) {
    				if (if_block) {
    					if (dirty & /*showParagraph*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t2.parentNode, t2);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*discard, boxes, console*/ 20) {
    				const each_value = /*boxes*/ ctx[2];
    				validate_each_argument(each_value);
    				group_outros();
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, fix_and_outro_and_destroy_block, create_each_block$2, each_1_anchor, get_each_context$2);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[6](null);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each_1_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let boxInput;
    	let showParagraph = false;
    	const progress = tweened(0, { delay: 0, duration: 700, easing: cubicIn });

    	setTimeout(
    		() => {
    			progress.set(0.5);
    		},
    		1500
    	);

    	let boxes = [];

    	function addBox() {
    		$$invalidate(2, boxes = [boxInput.value, ...boxes]);
    	}

    	function discard(value) {
    		$$invalidate(2, boxes = boxes.filter(el => el !== value));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => $$invalidate(1, showParagraph = !showParagraph);

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			boxInput = $$value;
    			$$invalidate(0, boxInput);
    		});
    	}

    	const introstart_handler = () => console.log("adding the element starts");
    	const introend_handler = () => console.log("adding the element ends");
    	const outrostart_handler = () => console.log("removing the element starts");
    	const outroend_handler = () => console.log("removing the element ends");

    	$$self.$capture_state = () => ({
    		writable,
    		tweened,
    		cubicIn,
    		fade,
    		fly,
    		slide,
    		scale,
    		flip,
    		Spring,
    		App,
    		boxInput,
    		showParagraph,
    		progress,
    		boxes,
    		addBox,
    		discard
    	});

    	$$self.$inject_state = $$props => {
    		if ("boxInput" in $$props) $$invalidate(0, boxInput = $$props.boxInput);
    		if ("showParagraph" in $$props) $$invalidate(1, showParagraph = $$props.showParagraph);
    		if ("boxes" in $$props) $$invalidate(2, boxes = $$props.boxes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		boxInput,
    		showParagraph,
    		boxes,
    		addBox,
    		discard,
    		click_handler,
    		input_binding,
    		introstart_handler,
    		introend_handler,
    		outrostart_handler,
    		outroend_handler
    	];
    }

    class App_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App_1",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    const app = new App_1({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
