import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationOptions,
    registerDecorator,
} from "class-validator";

@ValidatorConstraint({ name: "isTransactionDataValid", async: false })
export class IsTransactionDataConstraint
    implements ValidatorConstraintInterface
{
    validate(values: any[]) {
        if (!values) return true;
        if (!Array.isArray(values)) return false;

        return values.every(
            (item) =>
                typeof item?.type === "string" &&
                Array.isArray(item?.credential_ids) &&
                item.credential_ids.length > 0 &&
                item.credential_ids.every((id: any) => typeof id === "string"),
        );
    }

    defaultMessage() {
        return 'Each transaction_data object must have a "type" (string) and a non-empty "credential_ids" (string array).';
    }
}

export function IsTransactionData(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsTransactionDataConstraint,
        });
    };
}
