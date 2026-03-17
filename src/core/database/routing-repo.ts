import { supabase } from './supabase';
import { Database } from '../../types/supabase';

type RoutingRule = Database['public']['Tables']['routing_rules']['Row'];
type RoutingRuleInsert = Database['public']['Tables']['routing_rules']['Insert'];

export class RoutingRuleRepository {
  /**
   * Create a new routing rule
   */
  async createRule(rule: RoutingRuleInsert): Promise<RoutingRule> {
    const { data, error } = await supabase
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
  async getActiveRules(): Promise<RoutingRule[]> {
    const { data, error } = await supabase
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
  async getRule(id: string): Promise<RoutingRule | null> {
    const { data, error } = await supabase
      .from('routing_rules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get routing rule: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a routing rule
   */
  async updateRule(id: string, updates: Partial<RoutingRuleInsert>): Promise<RoutingRule> {
    const { data, error } = await supabase
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
  async deleteRule(id: string, hardDelete: boolean = false): Promise<void> {
    if (hardDelete) {
      const { error } = await supabase
        .from('routing_rules')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(`Failed to delete routing rule: ${error.message}`);
      }
    } else {
      await this.updateRule(id, { is_active: false });
    }
  }
}
