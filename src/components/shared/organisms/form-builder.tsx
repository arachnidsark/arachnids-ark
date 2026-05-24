'use client';

import * as React from 'react';
import { useForm, FormProvider, type DefaultValues, type FieldValues, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField, type InputFormFieldProps, type SelectFormFieldProps } from '@/components/shared/molecules/form-field';
import { Button } from '@/components/shared/atoms/button';
import { cn } from '@/lib/utils';

/**
 * FormBuilder configuration for individual fields.
 * Preserves the union properties of FormFieldProps while adding form-specific layout options.
 */
export type FormFieldConfig<T extends FieldValues = any> = (
  | (Omit<InputFormFieldProps, 'name'> & { name: string })
  | (Omit<SelectFormFieldProps, 'name'> & { name: string })
) & {
  gridSpan?: string;
  /** Optional callback to conditionally render the field based on form state */
  renderIf?: (values: T) => boolean;
};

/**
 * FormBuilder Props.
 * Completely customizable through props, ensuring reusability across user/admin views.
 */
export interface FormBuilderProps<T extends FieldValues> {
  /** Zod schema for validation */
  schema: z.Schema<T>;
  /** Initial values for the form */
  defaultValues?: DefaultValues<T>;
  /** Configuration for all fields in the form */
  fields: FormFieldConfig<T>[];
  /** Callback triggered on successful form submission */
  onSubmit: (data: T) => void | Promise<void>;
  /** Text for the submit button */
  submitLabel?: string;
  /** If true, the submit button shows a loading spinner */
  isSubmitting?: boolean;
  /** Optional class for the form container */
  className?: string;
  /** Optional class for the fields grid */
  gridClassName?: string;
  /** Optional children (e.g., secondary buttons, links, or dynamic sections requiring form state) */
  children?: React.ReactNode | ((methods: import('react-hook-form').UseFormReturn<T>) => React.ReactNode);
  /** Alignment for the submit button */
  submitAlignment?: 'left' | 'center' | 'right';
}

/**
 * Global FormBuilder Organism.
 * A rock-solid, end-to-end implementation for building forms with zero boilerplate.
 */
export function FormBuilder<T extends FieldValues>({
  schema,
  defaultValues,
  fields,
  onSubmit,
  submitLabel = 'Submit',
  isSubmitting = false,
  className,
  gridClassName,
  children,
  submitAlignment = 'left'
}: FormBuilderProps<T>) {
  const methods = useForm<T>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as unknown as Resolver<T>,
    defaultValues
  });

  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const values = methods.watch();

  return (
    <FormProvider {...methods}>
      <form 
        onSubmit={methods.handleSubmit(handleSubmit)} 
        className={cn("space-y-6", className)}
      >
        {/* Fields Grid */}
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", gridClassName)}>
          {fields.map((field) => {
            // Check for conditional rendering
            if (field.renderIf && !field.renderIf(values)) {
              return null;
            }

            return (
              <div key={field.name} className={cn(field.gridSpan || "col-span-1")}>
                <FormField {...field} />
              </div>
            );
          })}
        </div>

        {/* Custom Sections (Children) */}
        {children && (
          <div className="space-y-6">
            {typeof children === 'function' ? children(methods) : children}
          </div>
        )}

        {/* Form Actions */}
        <div className={cn(
          "flex items-center gap-4 pt-6 border-t border-border/50",
          submitAlignment === 'center' && "justify-center",
          submitAlignment === 'right' && "justify-end"
        )}>
          <Button 
            type="submit" 
            isLoading={isSubmitting}
            premium
            className="px-8"
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
