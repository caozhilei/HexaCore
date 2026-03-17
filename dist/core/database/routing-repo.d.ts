import { Database } from '../../types/supabase';
type RoutingRule = Database['public']['Tables']['routing_rules']['Row'];
type RoutingRuleInsert = Database['public']['Tables']['routing_rules']['Insert'];
export declare class RoutingRuleRepository {
    /**
     * Create a new routing rule
     */
    createRule(rule: RoutingRuleInsert): Promise<RoutingRule>;
    /**
     * Get all active routing rules, ordered by priority (descending)
     */
    getActiveRules(): Promise<RoutingRule[]>;
    /**
     * Get a rule by ID
     */
    getRule(id: string): Promise<RoutingRule | null>;
    /**
     * Update a routing rule
     */
    updateRule(id: string, updates: Partial<RoutingRuleInsert>): Promise<RoutingRule>;
    /**
     * Delete (or soft delete) a rule
     */
    deleteRule(id: string, hardDelete?: boolean): Promise<void>;
}
export {};
