"use strict";
// tslint:disable:unified-signatures
Object.defineProperty(exports, "__esModule", { value: true });
const objects_1 = require("alcalzone-shared/objects");
const str2regex_1 = require("../str2regex");
const objectTemplate = Object.freeze({
    type: "state",
    common: { name: "an object" },
    native: {},
});
const stateTemplate = Object.freeze({
    ack: false,
    val: 0,
});
/**
 * A minimalistic version of ioBroker's Objects and States DB that just operates on a Map
 */
class MockDatabase {
    constructor() {
        this.objects = new Map();
        this.states = new Map();
    }
    clearObjects() {
        this.objects.clear();
    }
    clearStates() {
        this.states.clear();
    }
    clear() {
        this.clearObjects();
        this.clearStates();
    }
    publishObject(obj) {
        if (obj._id == null)
            throw new Error("An object must have an ID");
        if (obj.type == null)
            throw new Error("An object must have a type");
        const completeObject = objects_1.extend({}, objectTemplate, obj);
        this.objects.set(obj._id, completeObject);
    }
    publishObjects(...objects) {
        objects.forEach(this.publishObject);
    }
    publishStateObjects(...objects) {
        objects
            .map(obj => objects_1.extend({}, obj, { type: "state" }))
            .forEach(this.publishObject.bind(this));
    }
    publishChannelObjects(...objects) {
        objects
            .map(obj => objects_1.extend({}, obj, { type: "channel" }))
            .forEach(this.publishObject.bind(this));
    }
    publishDeviceObjects(...objects) {
        objects
            .map(obj => objects_1.extend({}, obj, { type: "device" }))
            .forEach(this.publishObject.bind(this));
    }
    deleteObject(objOrID) {
        this.objects.delete(typeof objOrID === "string" ? objOrID : objOrID._id);
    }
    publishState(id, state) {
        // if (typeof id !== "string") throw new Error("The id must be given!");
        if (state == null) {
            this.deleteState(id);
            return;
        }
        const completeState = objects_1.extend({}, stateTemplate, state);
        this.states.set(id, completeState);
    }
    deleteState(id) {
        this.states.delete(id);
    }
    hasObject(namespaceOrId, id) {
        id = namespaceOrId + (id ? "." + id : "");
        return this.objects.has(id);
    }
    getObject(namespaceOrId, id) {
        // combines getObject and getForeignObject into one
        id = namespaceOrId + (id ? "." + id : "");
        return this.objects.get(id);
    }
    hasState(namespaceOrId, id) {
        id = namespaceOrId + (id ? "." + id : "");
        return this.states.has(id);
    }
    getState(namespaceOrId, id) {
        // combines getObject and getForeignObject into one
        id = namespaceOrId + (id ? "." + id : "");
        return this.states.get(id);
    }
    getObjects(namespaceOrPattern, patternOrType, type) {
        // combines getObjects and getForeignObjects into one
        let pattern;
        if (type != null) {
            pattern = namespaceOrPattern + (patternOrType ? "." + patternOrType : "");
        }
        else if (patternOrType != null) {
            if (["state", "channel", "device"].indexOf(patternOrType) > -1) {
                type = patternOrType;
                pattern = namespaceOrPattern;
            }
            else {
                pattern = namespaceOrPattern + "." + patternOrType;
            }
        }
        else {
            pattern = namespaceOrPattern;
        }
        const idRegExp = str2regex_1.str2regex(pattern);
        return objects_1.composeObject([...this.objects.entries()]
            .filter(([id]) => idRegExp.test(id))
            .filter(([, obj]) => type == null || obj.type === type));
    }
    getStates(pattern) {
        // combines getStates and getForeignStates into one
        const idRegExp = str2regex_1.str2regex(pattern);
        return objects_1.composeObject([...this.states.entries()]
            .filter(([id]) => idRegExp.test(id)));
    }
}
exports.MockDatabase = MockDatabase;
/**
 * Returns a collection of predefined assertions to be used in unit tests
 * Those include assertions for:
 * * State exists
 * * State has a certain value, ack flag, object property
 * * Object exists
 * * Object has a certain common or native part
 * @param db The mock database to operate on
 * @param adapter The mock adapter to operate on
 */
function createAsserts(db, adapter) {
    function normalizeID(prefix, suffix) {
        let id = `${prefix}${suffix ? "." + suffix : ""}`;
        // Test if this ID is fully qualified
        if (!/^[a-z0-9\-_]+\.\d+\./.test(id)) {
            id = adapter.namespace + "." + id;
        }
        return id;
    }
    const ret = {
        assertObjectExists(prefix, suffix) {
            const id = normalizeID(prefix, suffix);
            db.hasObject(id).should.equal(true, `The object "${adapter.namespace}.${id}" does not exist but it was expected to!`);
        },
        assertStateExists(prefix, suffix) {
            const id = normalizeID(prefix, suffix);
            db.hasState(id).should.equal(true, `The state "${adapter.namespace}.${id}" does not exist but it was expected to!`);
        },
        assertStateHasValue(prefix, suffix, value) {
            ret.assertStateProperty(prefix, suffix, "val", value);
        },
        assertStateIsAcked(prefix, suffix, ack = true) {
            ret.assertStateProperty(prefix, suffix, "ack", ack);
        },
        assertStateProperty(prefix, suffix, property, value) {
            const id = normalizeID(prefix, suffix);
            ret.assertStateExists(id, undefined);
            db.getState(id)
                .should.be.an("object")
                .that.has.property(property, value);
        },
        assertObjectCommon(prefix, suffix, common) {
            const id = normalizeID(prefix, suffix);
            ret.assertObjectExists(prefix, suffix);
            const dbObj = db.getObject(id);
            dbObj.should.be.an("object")
                .that.has.property("common");
            dbObj.common.should.be.an("object")
                .that.nested.include(common);
        },
        assertObjectNative(prefix, suffix, native) {
            const id = normalizeID(prefix, suffix);
            ret.assertObjectExists(prefix, suffix);
            const dbObj = db.getObject(id);
            dbObj.should.be.an("object")
                .that.has.property("native");
            dbObj.native.should.be.an("object")
                .that.nested.include(native);
        },
    };
    return ret;
}
exports.createAsserts = createAsserts;