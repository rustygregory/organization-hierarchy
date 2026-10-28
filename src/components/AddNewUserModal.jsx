import { useState } from 'react'
import styled from 'styled-components'
import { Modal } from '@zendeskgarden/react-modals'
import { Button } from '@zendeskgarden/react-buttons'
import { Field, Label, Input, Radio, Fieldset, Hint } from '@zendeskgarden/react-forms'
import { getColor } from '@zendeskgarden/react-theming'

const fgDefault = ({ theme }) => getColor({ theme, variable: 'foreground.default' })

const StyledModal = styled(Modal)`
  width: 544px;
`

const Header = styled(Modal.Header)`
  color: ${fgDefault};
`

const FormStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const FormLabel = styled(Label)`
  color: ${fgDefault};
`

/* Radio labels default to bold in Flora; keep that for End user / Staff member. */
const RadioLabel = styled(Label)`
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  color: ${fgDefault};
`

const UserTypeLegend = styled(Fieldset.Legend)`
  color: ${fgDefault};
`

/* Align with the label text (“End”), not the radio control — radio is 16px + 8px gap. */
const EndUserHint = styled(Hint)`
  && {
    padding-inline-start: 24px;
    color: ${fgDefault};
  }
`

const OrgName = styled.span`
  font-weight: ${(props) => props.theme.fontWeights.semibold};
`

/**
 * Prototype-only “Add new user” dialog. Fields and buttons are presentational —
 * Cancel / Add / close all call onClose. orgName is interpolated into the grant
 * copy under the End user radio.
 */
export default function AddNewUserModal({ orgName, onClose }) {
  const [userType, setUserType] = useState('end-user')

  return (
    <StyledModal onClose={onClose}>
      <Header tag="h1">Add new user</Header>
      <Modal.Close aria-label="Close modal" />
      <Modal.Body>
        <FormStack>
          <Field>
            <FormLabel>Name</FormLabel>
            <Input />
          </Field>
          <Field>
            <FormLabel>Email</FormLabel>
            <Input type="email" />
          </Field>
          <Fieldset>
            <UserTypeLegend>User type</UserTypeLegend>
            <Field>
              <Radio
                name="user-type"
                value="end-user"
                checked={userType === 'end-user'}
                onChange={() => setUserType('end-user')}
              >
                <RadioLabel>End user</RadioLabel>
              </Radio>
              <EndUserHint>
                You&apos;re about to grant this user access to tickets in{' '}
                <OrgName>{orgName}</OrgName> child organization and their
                descendants.
              </EndUserHint>
            </Field>
            <Field>
              <Radio
                name="user-type"
                value="staff"
                checked={userType === 'staff'}
                onChange={() => setUserType('staff')}
              >
                <RadioLabel>Staff member</RadioLabel>
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
