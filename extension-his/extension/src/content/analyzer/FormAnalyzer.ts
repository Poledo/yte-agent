import { FieldInfo } from '../../shared/models/FieldInfo'
import { FieldRegistry } from '../../shared/registry/FieldRegistry'
import { FieldDiscovery } from './FieldDiscovery'
import { LabelResolver } from './LabelResolver'
import { MetadataBuilder } from './MetadataBuilder'

/**
 * FormAnalyzer
 * Orchestrates form analysis: discovery, label resolution, metadata building
 * and registration into Field Registry
 */
export class FormAnalyzer {
    /**
     * Dependency injection of analyzer components
     */
    private discovery = new FieldDiscovery()
    private labelResolver = new LabelResolver()
    private metadataBuilder = new MetadataBuilder()

    /**
     * Scan entire document for form fields
     *
     * @param document - Document to scan
     * @param registry - Field Registry to register discovered fields
     * @returns Array of discovered and registered FieldInfo objects
     */
    public scan(document: Document, registry: FieldRegistry): FieldInfo[] {
        const fields = this.discovery.discoverFields(document)
        return fields
            .map((element) => this.processField(element, registry))
            .filter((field): field is FieldInfo => field !== null)
    }

    /**
     * Scan a specific node for form fields
     *
     * @param node - Node to scan
     * @param registry - Field Registry to register discovered fields
     * @returns Array of discovered and registered FieldInfo objects
     */
    public scanNode(node: Node, registry: FieldRegistry): FieldInfo[] {
        if (!(node instanceof Element)) {
            return []
        }
        const fields = this.discovery.discoverFields(node as Element)
        return fields
            .map((element) => this.processField(element, registry))
            .filter((field): field is FieldInfo => field !== null)
    }

    /**
     * Scan a single element for field
     *
     * @param element - Element to scan
     * @param registry - Field Registry to register the field
     * @returns FieldInfo object or null if element is not a valid field
     */
    public scanElement(element: HTMLElement, registry: FieldRegistry): FieldInfo | null {
        // Check if element is a valid field using a temporary discovery
        const fields = this.discovery.discoverFields(element.parentElement || document)
        if (!fields.includes(element)) {
            return null
        }
        return this.processField(element, registry)
    }

    /**
     * Process a single field element:
     * 1. Resolve label
     * 2. Build metadata
     * 3. Register to registry
     *
     * @param element - Field element to process
     * @param registry - Field Registry to register the field
     * @returns FieldInfo object
     */
    private processField(element: HTMLElement, registry: FieldRegistry): FieldInfo {
        const label = this.labelResolver.resolveLabel(element)
        const fieldInfo = this.metadataBuilder.buildFieldInfo(element, label)
        registry.register(fieldInfo)
        return fieldInfo
    }
}
