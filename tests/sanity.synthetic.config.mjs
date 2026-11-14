// Local schema extraction only; this is not a real project and never accesses Sanity.
import {defineConfig} from 'sanity';
import {schemaTypes} from '../src/cms/schema.mjs';
export default defineConfig({name:'schema-test', title:'Schema test', projectId:'synthetic1', dataset:'test', schema:{types:schemaTypes}});
