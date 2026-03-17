"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingRuleRepository = void 0;
const supabase_1 = require("./supabase");
class RoutingRuleRepository {
    /**
     * Create a new routing rule
     */
    async createRule(rule) {
        const { data, error } = await supabase_1.supabase
            .from('routing_rules')
            // @ts-ignore
            .insert(rule)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create routing rule: ${error.message}`);
        }
        return data;
    }
    /**
     * Get all active routing rules, ordered by priority (descending)
     */
    async getActiveRules() {
        const { data, error } = await supabase_1.supabase
            .from('routing_rules')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false });
        if (error) {
            throw new Error(`Failed to get routing rules: ${error.message}`);
        }
        return data;
    }
    /**
     * Get a rule by ID
     */
    async getRule(id) {
        const { data, error } = await supabase_1.supabase
            .from('routing_rules')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null;
            throw new Error(`Failed to get routing rule: ${error.message}`);
        }
        return data;
    }
    /**
     * Update a routing rule
     */
    async updateRule(id, updates) {
        const { data, error } = await supabase_1.supabase
            .from('routing_rules')
            // @ts-ignore
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update routing rule: ${error.message}`);
        }
        return data;
    }
    /**
     * Delete (or soft delete) a rule
     */
    async deleteRule(id, hardDelete = false) {
        if (hardDelete) {
            const { error } = await supabase_1.supabase
                .from('routing_rules')
                .delete()
                .eq('id', id);
            if (error) {
                throw new Error(`Failed to delete routing rule: ${error.message}`);
            }
        }
        else {
            await this.updateRule(id, { is_active: false });
        }
    }
}
exports.RoutingRuleRepository = RoutingRuleRepository;
//# sourceMappingURL=routing-repo.js.map