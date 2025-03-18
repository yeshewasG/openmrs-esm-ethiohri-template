import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Form, Select, SelectItem, DatePicker, DatePickerInput, Button } from '@carbon/react';
import { schema } from '../utils/form-schema';

type FormData = yup.InferType<typeof schema>;

const MrsForm: React.FC = () => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      sbccCompleted: '',
      reachedWithPackage: '',
      followUpDate: undefined,
      modalityUsed: '',
      snsQuestions: '',
    },
  });

  const modalityUsed = watch('modalityUsed');

  const onSubmit = (data: FormData) => {
    console.log('Form Data:', data);
    // Add your form submission logic here
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="mrs-form">
      {/* SBCC Completed */}
      <Controller
        name="sbccCompleted"
        control={control}
        render={({ field }) => (
          <Select
            id="sbccCompleted"
            labelText="SBCC Completed"
            invalid={!!errors.sbccCompleted}
            invalidText={errors.sbccCompleted?.message}
            {...field}
          >
            <SelectItem value="" text="Select an option" />
            <SelectItem value="Yes" text="Yes" />
            <SelectItem value="No" text="No" />
          </Select>
        )}
      />

      {/* Reached with Package of Service */}
      <Controller
        name="reachedWithPackage"
        control={control}
        render={({ field }) => (
          <Select
            id="reachedWithPackage"
            labelText="Reached with Package of Service"
            invalid={!!errors.reachedWithPackage}
            invalidText={errors.reachedWithPackage?.message}
            {...field}
          >
            <SelectItem value="" text="Select an option" />
            <SelectItem value="Yes" text="Yes" />
            <SelectItem value="No" text="No" />
          </Select>
        )}
      />

      {/* Follow-Up Date */}
      <Controller
        name="followUpDate"
        control={control}
        render={({ field }) => (
          <DatePicker
            dateFormat="m/d/Y"
            datePickerType="single"
            value={field.value}
            onChange={(dates: Date[]) => field.onChange(dates[0])}
          >
            <DatePickerInput
              id="followUpDate"
              labelText="Follow-Up Date"
              placeholder="mm/dd/yyyy"
              invalid={!!errors.followUpDate}
              invalidText={errors.followUpDate?.message}
            />
          </DatePicker>
        )}
      />

      {/* Modality Used */}
      <Controller
        name="modalityUsed"
        control={control}
        render={({ field }) => (
          <Select
            id="modalityUsed"
            labelText="Modality Used to Reach"
            invalid={!!errors.modalityUsed}
            invalidText={errors.modalityUsed?.message}
            {...field}
          >
            <SelectItem value="" text="Select an option" />
            <SelectItem value="Self" text="Self" />
            <SelectItem value="PSP" text="PSP" />
            <SelectItem value="SNS" text="SNS" />
          </Select>
        )}
      />

      {/* Conditional SNS Questions */}
      {modalityUsed === 'SNS' && (
        <Controller
          name="snsQuestions"
          control={control}
          render={({ field }) => (
            <Select
              id="snsQuestions"
              labelText="SNS Questions"
              invalid={!!errors.snsQuestions}
              invalidText={errors.snsQuestions?.message}
              {...field}
            >
              <SelectItem value="" text="Select an option" />
              <SelectItem value="Option1" text="Option 1" />
              <SelectItem value="Option2" text="Option 2" />
            </Select>
          )}
        />
      )}

      <Button type="submit" style={{ marginTop: '1rem' }}>
        Submit
      </Button>
    </Form>
  );
};

export default MrsForm;
