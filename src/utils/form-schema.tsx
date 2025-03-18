import * as yup from 'yup';

export const schema = yup
  .object({
    sbccCompleted: yup.string().required('SBCC completion status is required'),
    reachedWithPackage: yup.string().required('Service package status is required'),
    followUpDate: yup.date().required('Follow-up date is required').typeError('Invalid date'),
    modalityUsed: yup.string().required('Modality selection is required'),
    snsQuestions: yup.string().when('modalityUsed', {
      is: 'SNS',
      then: (schema) => schema.required('SNS questions required when SNS modality selected'),
      otherwise: (schema) => schema.notRequired(),
    }),
  })
  .required();
