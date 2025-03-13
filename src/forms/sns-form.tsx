import React, { useState, useEffect } from 'react';
import { Form, TextInput, RadioButtonGroup, RadioButton, NumberInput, FormGroup, Button } from '@carbon/react';
import { useForm, Controller } from 'react-hook-form';
import { OpenmrsDatePicker, usePatient, showToast, openmrsFetch, useSession } from '@openmrs/esm-framework'; // Adjust based on your setup
import styles from './sns-form.scss';

// Define OpenMRS-specific types
interface Observation {
  concept: string; // Concept UUID
  value: string | number | boolean | Date;
}

interface EncounterProviders {
  provider: string;
  encounterRole: string;
}
interface EncounterPayload {
  patient: string;
  encounterDatetime: string;
  location: string; // Replace with your location UUID
  encounterType: string; // Replace with your encounter type UUID
  obs: Observation[];
  encounterProviders: EncounterProviders[];
}

// Form data interface
interface FormData {
  sampleDate: Date | null;
  isCouponGiven: string;
  numberOfCoupons: number;
  coupons: { id: string }[];
}

const ClientForm: React.FC = () => {
  const { patient } = usePatient(); // Get patient from OpenMRS context
  const session = useSession();
  const { control, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      sampleDate: null,
      isCouponGiven: '',
      numberOfCoupons: 0,
      coupons: [],
    },
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isCouponGiven = watch('isCouponGiven');
  const numberOfCoupons = watch('numberOfCoupons');
  const coupons = watch('coupons');

  // OpenMRS API settings
  const apiBaseUrl = '/openmrs/ws/rest/v1'; // Relative path for microfrontends

  // Example concept UUIDs (replace with actual UUIDs from your OpenMRS instance)
  const conceptUuids = {
    sampleDate: '163137AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // e.g., "Visit Date"
    isCouponGiven: '165068AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // e.g., "Coupon Given?"
    numberOfCoupons: '165069AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // e.g., "Number of Coupons"
    couponId: '165070AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // e.g., "Coupon ID"
  };

  // Update coupon array when number of coupons changes
  useEffect(() => {
    const currentCoupons = coupons.length;
    if (numberOfCoupons > currentCoupons) {
      const newCoupons = Array(numberOfCoupons - currentCoupons)
        .fill(null)
        .map(() => ({ id: '' }));
      setValue('coupons', [...coupons, ...newCoupons]);
    } else if (numberOfCoupons < currentCoupons) {
      setValue('coupons', coupons.slice(0, numberOfCoupons));
    }
  }, [numberOfCoupons, coupons, setValue]);

  // Handle date change
  const onDateChange = (date: any | null, fieldName: keyof FormData) => {
    setValue(fieldName, date);
    if (formErrors[fieldName]) {
      setFormErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  };

  // Handle coupon ID change
  const handleCouponIdChange = (index: number, value: string) => {
    const newCoupons = [...coupons];
    newCoupons[index] = { id: value };
    setValue('coupons', newCoupons);
  };

  // Form submission to OpenMRS
  const onSubmit = async (data: FormData) => {
    const errors: Record<string, string> = {};

    if (!data.sampleDate) {
      errors.sampleDate = 'Date of visit is required';
    }
    if (!data.isCouponGiven) {
      errors.isCouponGiven = 'Please select an option';
    }
    if (data.isCouponGiven === 'yes') {
      if (data.numberOfCoupons <= 0) {
        errors.numberOfCoupons = 'Number of coupons must be greater than 0';
      }
      data.coupons.forEach((coupon, index) => {
        if (!coupon.id) {
          errors[`coupon_${index}`] = `Coupon ID ${index + 1} is required`;
        }
      });
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return; // Stop if there are validation errors
    }
    const encounterProviders = [
      { provider: session.currentProvider.uuid, encounterRole: 'a0b03050-c99b-11e0-9572-0800200c9a66' },
    ];
    // Construct OpenMRS encounter payload
    const encounterPayload: EncounterPayload = {
      patient: patient?.id || '', // Patient UUID from usePatient()
      encounterDatetime: data.sampleDate?.toISOString() || new Date().toISOString(),
      location: '7f65d926-2495-11e6-bfb2-537d5038b5ed', // Replace with your location UUID
      encounterType: 'e22e39fd-7db2-45e7-80f1-154e437b42e3', // Replace with your encounter type UUID (e.g., "SNS Form")
      encounterProviders,
      obs: [
        { concept: conceptUuids.sampleDate, value: data.sampleDate as Date },
        { concept: conceptUuids.isCouponGiven, value: data.isCouponGiven === 'yes' },
        ...(data.isCouponGiven === 'yes'
          ? [
              { concept: conceptUuids.numberOfCoupons, value: data.numberOfCoupons },
              ...data.coupons.map((coupon) => ({
                concept: conceptUuids.couponId,
                value: coupon.id,
              })),
            ]
          : []),
      ],
    };

    try {
      const response = await openmrsFetch(`${apiBaseUrl}/encounter`, {
        method: 'POST',
        body: JSON.stringify(encounterPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      showToast({
        title: 'Success',
        description: 'Form submitted successfully',
        kind: 'success',
      });
      console.log('Encounter created:', response);

      // Reset form after submission
      setValue('sampleDate', null);
      setValue('isCouponGiven', '');
      setValue('numberOfCoupons', 0);
      setValue('coupons', []);
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to submit form',
        kind: 'error',
      });
      console.error('Error submitting encounter:', error);
    }
  };

  const today = new Date();

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      {/* Date of Visit */}
      <div className={styles.field}>
        <Controller
          name="sampleDate"
          control={control}
          render={({ field: { onChange, value, ref } }) => (
            <OpenmrsDatePicker
              id="sampleDate"
              labelText="Date of Visit"
              value={value}
              maxDate={today}
              onChange={(date) => onDateChange(date, 'sampleDate')}
              ref={ref}
              invalid={!!formErrors.sampleDate}
              invalidText={formErrors.sampleDate}
            />
          )}
        />
      </div>

      {/* Coupon Question */}
      <div className={styles.field}>
        <Controller
          name="isCouponGiven"
          control={control}
          render={({ field }) => (
            <RadioButtonGroup
              {...field}
              name="isCouponGiven"
              legendText="Is coupon given for a client?"
              valueSelected={field.value}
              onChange={(value: any) => field.onChange(value)}
              invalid={!!formErrors.isCouponGiven}
              invalidText={formErrors.isCouponGiven}
            >
              <RadioButton value="yes" labelText="Yes" />
              <RadioButton value="no" labelText="No" />
            </RadioButtonGroup>
          )}
        />
      </div>

      {/* Coupon Fields */}
      {isCouponGiven === 'yes' && (
        <FormGroup legendText="Coupon Details">
          <div className={styles.field}>
            <Controller
              name="numberOfCoupons"
              control={control}
              render={({ field }) => (
                <NumberInput
                  {...field}
                  id="number-of-coupons"
                  label="Number of Coupons Given"
                  min={0}
                  value={field.value}
                  onChange={(_e, { value }) => field.onChange(value)}
                  invalid={!!formErrors.numberOfCoupons}
                  invalidText={formErrors.numberOfCoupons}
                />
              )}
            />
          </div>

          {coupons.map((coupon, index) => (
            <div key={index} className={styles.field}>
              <TextInput
                id={`coupon-${index}`}
                labelText={`Coupon ID ${index + 1}`}
                value={coupon.id}
                onChange={(e) => handleCouponIdChange(index, e.target.value)}
                invalid={!!formErrors[`coupon_${index}`]}
                invalidText={formErrors[`coupon_${index}`]}
              />
            </div>
          ))}
        </FormGroup>
      )}

      <Button type="submit" className={`cds--btn--primary ${styles.btn}`}>
        Submit
      </Button>
    </Form>
  );
};

export default ClientForm;
