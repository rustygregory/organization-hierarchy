import { useState } from 'react'
import styled from 'styled-components'
import { Modal } from '@zendeskgarden/react-modals'
import { Button } from '@zendeskgarden/react-buttons'
import { Field, Label, Input, Radio, Fieldset } from '@zendeskgarden/react-forms'
import { MD } from '@zendeskgarden/react-typography'

const StyledModal = styled(Modal)`
  width: 544px;
`

const BodyCopy = styled(MD)`
  margin: 0 0 20px;
`

const FormStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

/**
 * Prototype-only “Add new user” dialog. Fields and buttons are presentational —
 * Cancel / Add / close all call onClose. orgName is interpolated into the grant copy.
 */
export default function AddNewUserModal({ orgName, onClose }) {
  const [userType, setUserType] = useState('end-user')

  return (
    <StyledModal onClose={onClose}>
      <Modal.Header tag="h1">Add new user</Modal.Header>
      <Modal.Close aria-label="Close modal" />
      <Modal.Body>
        <BodyCopy>
          You&apos;re about to grant this user access to tickets in {orgName} child
          organization and their descendants.
        </BodyCopy>
        <FormStack>
          <Field>
            <Label>Name</Label>
            <Input />
          </Field>
          <Field>
            <Label>Email</Label>
            <Input type="email" />
          </Field>
          <Fieldset>
            <Fieldset.Legend>User type</Fieldset.Legend>
            <Field>
              <Radio
                name="user-type"
                value="end-user"
                checked={userType === 'end-user'}
                onChange={() => setUserType('end-user')}
              >
                <Label isRegular>End user</Label>
              </Radio>
            </Field>
            <Field>
              <Radio
                name="user-type"
                value="staff"
                checked={userType === 'staff'}
                onChange={() => setUserType('staff')}
              >
                <Label isRegular>Staff member</Label>
              </Radio>
            </Field>
          </Fieldset>
        </FormStack>
      </Modal.Body>
      <Modal.Footer>
        <Modal.FooterItem>
          <Button isBasic onClick={onClose}>
            Cancel
          </Button>
        </Modal.FooterItem>
        <Modal.FooterItem>
          <Button isPrimary onClick={onClose}>
            Add
          </Button>
        </Modal.FooterItem>
      </Modal.Footer>
    </StyledModal>
  )
}
