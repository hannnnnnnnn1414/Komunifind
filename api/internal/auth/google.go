package auth

import (
	"context"
	"errors"

	"google.golang.org/api/idtoken"
)

type GoogleIdentity struct {
	Sub     string
	Email   string
	Name    string
	Picture string
}

type Verifier struct {
	clientID  string
	validator *idtoken.Validator
}

func NewVerifier(ctx context.Context, clientID string) (*Verifier, error) {
	if clientID == "" {
		return nil, errors.New("GOOGLE_CLIENT_ID is not configured")
	}
	validator, err := idtoken.NewValidator(ctx)
	if err != nil {
		return nil, err
	}
	return &Verifier{clientID: clientID, validator: validator}, nil
}

func (v *Verifier) Verify(ctx context.Context, token string) (GoogleIdentity, error) {
	payload, err := v.validator.Validate(ctx, token, v.clientID)
	if err != nil {
		return GoogleIdentity{}, err
	}
	id := GoogleIdentity{
		Sub:     payload.Subject,
		Email:   stringClaim(payload.Claims, "email"),
		Name:    stringClaim(payload.Claims, "name"),
		Picture: stringClaim(payload.Claims, "picture"),
	}
	if id.Sub == "" || id.Email == "" {
		return GoogleIdentity{}, errors.New("google token missing sub/email")
	}
	return id, nil
}

func stringClaim(claims map[string]any, key string) string {
	if v, ok := claims[key].(string); ok {
		return v
	}
	return ""
}
